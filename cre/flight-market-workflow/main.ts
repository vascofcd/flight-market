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
import { fetchSchipholById } from "./providers/schipholById.js";
import { normalize } from "./lib/normalize.js";
import { buildEvidencePack, makeEvidenceSource } from "./lib/evidence.js";
import type { FlightAPIResponse } from "./types.js";


type Config = {
  chainSelectorName: string;
  marketAddress: string;
  receiverAddress: string;
  gasLimit: string;

  // Schiphol only (by-id)
  schipholBaseUrl: string; // "https://api.schiphol.nl/public-flights"
  schipholResourceVersion: string; // "v4"
};

// event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uint256 thresholdMin);
const settlementEventAbi = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uint256 thresholdMin)",
]);

const SETTLEMENT_EVENT_SIG =
  "SettlementRequested(uint256,string,uint256,uint256)";
const SETTLEMENT_EVENT_HASH = keccak256(toBytes(SETTLEMENT_EVENT_SIG));

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isHexAddress(v: unknown): v is string {
  return typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
}

function safeGetString(raw: any, key: keyof Config, fallback = ""): string {
  const v = raw?.[key];
  return isNonEmptyString(v) ? v : fallback;
}

type SettlementResult = {
  marketId: string;
  schipholFlightId: string;
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

function fetchSchiphol(
  runtime: Runtime<Config>,
  schipholId: string,
): FlightAPIResponse {
  const appId = runtime.getSecret({ id: "SCHIPHOL_APP_ID" }).result().value;
  const appKey = runtime.getSecret({ id: "SCHIPHOL_APP_KEY" }).result().value;
  if (!appId || !appKey)
    throw new Error(
      "Missing Schiphol secrets: SCHIPHOL_APP_ID / SCHIPHOL_APP_KEY",
    );

  const headers: Record<string, string> = {
    accept: "application/json",
    ResourceVersion: runtime.config.schipholResourceVersion,
    app_id: appId,
    app_key: appKey,
  };

  return fetchSchipholById(runtime, {
    headers,
    id: schipholId,
    cfg: {
      baseUrl: runtime.config.schipholBaseUrl,
      resourceVersion: runtime.config.schipholResourceVersion,
    },
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

  // Guard wrong log index
  const topic0 = topics[0]?.toLowerCase();
  const expected = SETTLEMENT_EVENT_HASH.toLowerCase();
  if (topic0 !== expected) {
    throw new Error(
      `Wrong log selected. Expected SettlementRequested topic0=${expected} but got ${topic0}. ` +
        `Use the requestSettlement tx hash and correct log index.`,
    );
  }

  const decoded = decodeEventLog({ abi: settlementEventAbi, data, topics });
  const { marketId, flightId, departTs, thresholdMin } =
    decoded.args as unknown as {
      marketId: bigint;
      flightId: string; // MUST be Schiphol numeric id in this version
      departTs: bigint;
      thresholdMin: bigint;
    };

  runtime.log(`SettlementRequested detected`);
  runtime.log(`  marketId     = ${marketId.toString()}`);
  runtime.log(`  flightId     = ${flightId} (must be Schiphol id)`);
  runtime.log(`  departTs     = ${departTs.toString()}`);
  runtime.log(`  thresholdMin = ${thresholdMin.toString()}`);

  // 1) Fetch ONLY /flights/{id}
  const resp = fetchSchiphol(runtime, flightId);

  // 2) Normalize (delay + CNX/DIV)
  const source = (() => {
    try {
      const normalized = normalize("SchipholById", flightId, resp);
      return makeEvidenceSource(
        "SchipholById",
        resp.statusCode,
        resp.rawJsonString,
        normalized,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return makeEvidenceSource(
        "SchipholById",
        resp.statusCode,
        resp.rawJsonString,
        undefined,
        msg,
      );
    }
  })();

  if (!source.ok || !source.normalized) {
    throw new Error(
      `SchipholById normalization failed: ${source.error ?? "unknown_error"}`,
    );
  }

  // 3) Build evidence + hash
  const generatedAtTs = Math.floor(Date.now() / 1000);
  const { pack, canonicalJson, evidenceHash } = buildEvidencePack({
    workflowName: "flight-delay-workflow",
    workflowVersion: "0.5.1-schiphol-id-only-safe-init",
    generatedAtTs,

    marketId: marketId.toString(),
    schipholFlightId: flightId,
    departTs: departTs.toString(),
    thresholdMin: thresholdMin.toString(),

    source,
  });

  runtime.log(`EvidenceHash: ${evidenceHash}`);
  runtime.log(`EvidencePack (canonical JSON):`);
  runtime.log(canonicalJson);

  // 4) Onchain boolean = "disruption" (CNX or DIV or delay>=threshold)
  const delayMinutes = pack.computed.delayMinutes;
  const cancelled = pack.computed.cancelled;
  const diverted = pack.computed.diverted;
  const status = pack.computed.status;
  const settledAsDisruption = pack.computed.settledAsDisruption;

  runtime.log(
    `Computed: status=${status} delayMinutes=${delayMinutes} cancelled=${cancelled} diverted=${diverted}`,
  );
  runtime.log(
    `Onchain outcome (bool) settledAsDisruption=${settledAsDisruption}`,
  );

  // 5) Report payload (uint256,bool,uint256,bytes32)
  const reportPayloadHex = encodeAbiParameters(
    parseAbiParameters(
      "uint256 marketId, bool delayed, uint256 delayMinutes, bytes32 evidenceHash",
    ),
    [marketId, settledAsDisruption, BigInt(delayMinutes), evidenceHash],
  );
  const reportPayloadB64 = hexToBase64(reportPayloadHex);

  // 6) Signed report
  const reportResponse = runtime
    .report({
      encodedPayload: reportPayloadB64,
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  // 7) Onchain write (dry-run unless --broadcast)
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
    schipholFlightId: flightId,
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
  // SAFE init: never pass invalid values to logTrigger (avoids WASM unreachable traps)
  const chainSelectorName = safeGetString(raw, "chainSelectorName");
  const marketAddress = safeGetString(raw, "marketAddress");
  const receiverAddress = safeGetString(raw, "receiverAddress");

  const schipholBaseUrl = safeGetString(
    raw,
    "schipholBaseUrl",
    "https://api.schiphol.nl/public-flights",
  );
  const schipholResourceVersion = safeGetString(
    raw,
    "schipholResourceVersion",
    "v4",
  );
  const gasLimit = safeGetString(raw, "gasLimit", "1000000");

  const problems: string[] = [];
  if (!isNonEmptyString(chainSelectorName))
    problems.push(`chainSelectorName missing`);
  if (!isHexAddress(marketAddress))
    problems.push(`marketAddress invalid: "${marketAddress}"`);
  if (!isHexAddress(receiverAddress))
    problems.push(`receiverAddress invalid: "${receiverAddress}"`);
  if (!isNonEmptyString(schipholBaseUrl))
    problems.push(`schipholBaseUrl missing`);
  if (!isNonEmptyString(schipholResourceVersion))
    problems.push(`schipholResourceVersion missing`);
  if (!isNonEmptyString(gasLimit)) problems.push(`gasLimit missing`);

  if (problems.length > 0) {
    // NOTE: returning [] avoids engine crash and prints a clear message.
    console.log(`[CONFIG ERROR] ${problems.join(" | ")}`);
    console.log(`Fix workflows/flight-delay/config.<target>.json and rerun.`);
    return [];
  }

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName,
    isTestnet: true,
  });
  if (!network) {
    console.log(
      `[CONFIG ERROR] Network not found for chainSelectorName="${chainSelectorName}"`,
    );
    return [];
  }

  // Mutate raw so runtime.config has defaults filled
  raw.schipholBaseUrl = schipholBaseUrl;
  raw.schipholResourceVersion = schipholResourceVersion;
  raw.gasLimit = gasLimit;

  const evmClient = new EVMClient(network.chainSelector.selector);

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(marketAddress)],
        topics: [{ values: [hexToBase64(SETTLEMENT_EVENT_HASH)] }],
        confidence: "CONFIDENCE_LEVEL_FINALIZED",
      }),
      onSettlementRequested,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
