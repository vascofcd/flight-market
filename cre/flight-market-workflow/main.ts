import {
  EVMClient,
  Runner,
  getNetwork,
  handler,
  bytesToHex,
  hexToBase64,
  type Runtime,
  type EVMLog,
} from "@chainlink/cre-sdk";
import {
  decodeEventLog,
  encodeAbiParameters,
  keccak256,
  parseAbi,
  parseAbiParameters,
  toBytes,
} from "viem";

import { fetchAirlabsFlight } from "./providers/airlabsDelays";
import { normalizeAirlabsFlight } from "./lib/normalize";
import { buildEvidencePack, makeEvidenceSource } from "./lib/evidence";
import type { FlightAPIResponse } from "./types";

type Config = {
  chainSelectorName: string;
  marketAddress: string;
  receiverAddress: string;
  gasLimit: string;

  airlabsBaseUrl: string;
  airlabsDelayMetric: "dep" | "arr" | "any";
  matchWindowSeconds: string;
};

const settlementEventAbi = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uint256 thresholdMin)",
]);

const SETTLEMENT_EVENT_SIG =
  "SettlementRequested(uint256,string,uint256,uint256)";

const SETTLEMENT_EVENT_HASH = keccak256(toBytes(SETTLEMENT_EVENT_SIG));

function requireString(label: string, v: unknown): string {
  if (typeof v !== "string" || v.length === 0)
    throw new Error(`Missing/invalid config: ${label}`);
  return v;
}

function requireAddress(label: string, addr: string) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr))
    throw new Error(`${label} must be 0x + 40 hex chars`);
}

type SettlementResult = {
  marketId: string;
  flightId: string;
  departTs: string;
  thresholdMin: string;

  delayMinutes: number;
  cancelled: boolean;
  diverted: boolean;
  status: string;

  evidenceHash: `0x${string}`;
  evidenceCanonicalJson: string;

  reportPayloadHex: `0x${string}`;
  reportPayloadB64: string;

  writeTxHashHex: `0x${string}`;
  writeTxStatus: string;
  receiverExecutionStatus: string;
  transactionFeeWei: string;
  errorMessage: string;
};

function airlabsKey(runtime: Runtime<Config>): string {
  const key = runtime.getSecret({ id: "AIRLABS_API_KEY" }).result().value;
  if (!key)
    throw new Error(
      "Missing secret AIRLABS_API_KEY (env var CRE_AIRLABS_API_KEY)",
    );
  return key;
}

function fetchFlight(
  runtime: Runtime<Config>,
  flightIata: string,
): FlightAPIResponse {
  return fetchAirlabsFlight(runtime, {
    baseUrl: runtime.config.airlabsBaseUrl,
    apiKey: airlabsKey(runtime),
    flightIata,
  });
}

const onSettlementRequested = (
  runtime: Runtime<Config>,
  log: EVMLog,
): SettlementResult => {
  const topics = log.topics.map((t) => bytesToHex(t)) as [
    `0x${string}`,
    ...`0x${string}`[],
  ];
  const data = bytesToHex(log.data);

  // Subscribe is broad; enforce correct event here
  const topic0 = topics[0]?.toLowerCase();
  const expected = SETTLEMENT_EVENT_HASH.toLowerCase();
  if (topic0 !== expected) {
    throw new Error(
      `Wrong log selected. Expected SettlementRequested topic0=${expected} but got ${topic0}.`,
    );
  }

  const decoded = decodeEventLog({ abi: settlementEventAbi, data, topics });
  const { marketId, flightId, departTs, thresholdMin } =
    decoded.args as unknown as {
      marketId: bigint;
      flightId: string; 
      departTs: bigint;
      thresholdMin: bigint;
    };

  const depart = Number(departTs);
  const threshold = Number(thresholdMin);
  const windowSeconds = Number(runtime.config.matchWindowSeconds);
  const delayMetric = runtime.config.airlabsDelayMetric;

  runtime.log(`SettlementRequested detected`);
  runtime.log(`  marketId     = ${marketId.toString()}`);
  runtime.log(`  flightId     = ${flightId}`);
  runtime.log(`  departTs     = ${departTs.toString()}`);
  runtime.log(`  thresholdMin = ${thresholdMin.toString()}`);
  runtime.log(
    `  delayMetric  = ${delayMetric} (using dep_delayed/arr_delayed/delayed)`,
  );

  // 1) Fetch ONLY /flight endpoint
  const resp = fetchFlight(runtime, flightId);

  // 2) Normalize
  let normalized;
  let sourceError: string | undefined;

  try {
    normalized = normalizeAirlabsFlight({
      flightId,
      departTs: depart,
      matchWindowSeconds: windowSeconds,
      delayMetric,
      resp,
    });

    // time sanity check
    // if (
    //   !normalized.withinWindow &&
    //   !normalized.cancelled &&
    //   !normalized.diverted
    // ) {
    //   throw new Error(
    //     `AirLabs flight dep_time_ts is too far from market departTs. diffSeconds=${normalized.departTsDiffSeconds}, window=${windowSeconds}`,
    //   );
    // }
  } catch (e) {
    sourceError = e instanceof Error ? e.message : String(e);
  }

  const sources = [
    makeEvidenceSource(
      "AirLabsFlight",
      resp.statusCode,
      resp.rawJsonString,
      { flight_iata: flightId },
      normalized,
      sourceError,
    ),
  ];

  if (!normalized || sourceError) {
    throw new Error(
      `AirLabs normalization failed: ${sourceError ?? "unknown_error"}`,
    );
  }

  // 3) Evidence + hash
  const generatedAtTs = Math.floor(Date.now() / 1000);
  const { canonicalJson, evidenceHash } = buildEvidencePack({
    workflowName: "flight-delay-workflow",
    workflowVersion: "0.7.0-airlabs-flight-only",
    generatedAtTs,

    marketId: marketId.toString(),
    flightId,
    departTs: departTs.toString(),
    thresholdMin: thresholdMin.toString(),

    matchWindowSeconds: windowSeconds,
    delayMetric,

    normalized,
    sources,
  });

  runtime.log(`EvidenceHash: ${evidenceHash}`);
  runtime.log(`EvidencePack (canonical JSON):`);
  // runtime.log(canonicalJson);

  const delayMinutes = normalized.delayMinutes;
  const cancelled = normalized.cancelled;
  const diverted = normalized.diverted;
  const status = normalized.status;

  // Onchain bool = disruption (cancel/divert/delay>=threshold)
  const settledAsDisruption =
    cancelled || diverted || delayMinutes >= threshold;

  // 4) Build report payload for FlightMarket.onReport:
  // (uint256 marketId, bool delayed, uint256 delayMinutes, bytes32 evidenceHash)
  const reportPayloadHex = encodeAbiParameters(
    parseAbiParameters(
      "uint256 marketId, bool delayed, uint256 delayMinutes, bytes32 evidenceHash",
    ),
    [marketId, settledAsDisruption, BigInt(delayMinutes), evidenceHash],
  );
  const reportPayloadB64 = hexToBase64(reportPayloadHex);

  // 5) Signed report
  const reportResponse = runtime
    .report({
      encodedPayload: reportPayloadB64,
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  // 6) Onchain write (dry-run unless you run simulate --broadcast)
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  });
  if (!network)
    throw new Error(`Network not found: ${runtime.config.chainSelectorName}`);

  const evmClient = new EVMClient(network.chainSelector.selector);

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.receiverAddress,
      report: reportResponse,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result();

  const txHashHex = bytesToHex(
    writeResult.txHash ?? new Uint8Array(32),
  ) as `0x${string}`;
  const writeTxStatus = String(writeResult.txStatus ?? "UNKNOWN");
  const receiverExecutionStatus = String(
    writeResult.receiverContractExecutionStatus ?? "UNKNOWN",
  );
  const transactionFeeWei = (
    (writeResult.transactionFee ?? 0n) as bigint
  ).toString();
  const errorMessage = String(writeResult.errorMessage ?? "");

  runtime.log(`Write report tx hash: ${txHashHex}`);
  runtime.log(
    `TxStatus=${writeTxStatus}, ReceiverStatus=${receiverExecutionStatus}, FeeWei=${transactionFeeWei}`,
  );
  if (errorMessage.length > 0) runtime.log(`ErrorMessage=${errorMessage}`);

  return {
    marketId: marketId.toString(),
    flightId,
    departTs: departTs.toString(),
    thresholdMin: thresholdMin.toString(),
    delayMinutes,
    cancelled,
    diverted,
    status,
    evidenceHash,
    evidenceCanonicalJson: canonicalJson,
    reportPayloadHex,
    reportPayloadB64,
    writeTxHashHex: txHashHex,
    writeTxStatus,
    receiverExecutionStatus,
    transactionFeeWei,
    errorMessage,
  };
};

const initWorkflow = (raw: Config) => {
  raw.chainSelectorName = requireString(
    "chainSelectorName",
    raw.chainSelectorName,
  );
  raw.marketAddress = requireString("marketAddress", raw.marketAddress);
  raw.receiverAddress = requireString("receiverAddress", raw.receiverAddress);
  raw.gasLimit = requireString("gasLimit", raw.gasLimit);

  raw.airlabsBaseUrl = requireString("airlabsBaseUrl", raw.airlabsBaseUrl);
  raw.airlabsDelayMetric = requireString(
    "airlabsDelayMetric",
    raw.airlabsDelayMetric,
  ) as any;
  raw.matchWindowSeconds = requireString(
    "matchWindowSeconds",
    raw.matchWindowSeconds,
  );

  requireAddress("marketAddress", raw.marketAddress);
  requireAddress("receiverAddress", raw.receiverAddress);

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: raw.chainSelectorName,
    isTestnet: true,
  });
  if (!network) throw new Error(`Network not found: ${raw.chainSelectorName}`);

  const evmClient = new EVMClient(network.chainSelector.selector);

  // Subscribe by address only (avoids some subscribe-time traps); filter by topic0 in handler.
  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(raw.marketAddress)],
      }),
      onSettlementRequested,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
