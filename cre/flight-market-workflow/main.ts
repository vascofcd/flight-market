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

import type { FlightAPIResponse } from "./types.js";
import { normalize } from "./normalize.js";
import { buildEvidencePack, makeEvidenceSource } from "./evidence.js";
import { fetchSchipholById } from "./providers/schipholById.js";

type Config = {
  chainSelectorName: string;
  marketAddress: string;
  receiverAddress: string;
  gasLimit: string;
  schipholBaseUrl: string; 
  schipholResourceVersion: string;
};

const settlementEventAbi = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uiny256 thresholdMin)",
]);

const SETTLEMENT_EVENT_SIG =
  "SettlementRequested(uint256,string,uint256,uiny256)";
const SETTLEMENT_EVENT_HASH = keccak256(toBytes(SETTLEMENT_EVENT_SIG));

function requireString(label: string, v: unknown): string {
  if (typeof v !== "string" || v.length === 0)
    throw new Error(`Missing/invalid config: ${label}`);
  return v;
}
function requireAddress(label: string, addr: string) {
  if (!addr.startsWith("0x") || addr.length !== 42)
    throw new Error(`${label} must be 0x + 40 hex chars`);
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

  // report payload
  reportPayloadHex: `0x${string}`;
  reportPayloadB64: string;

  // ALWAYS defined
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
      flightId: string; // WE EXPECT THIS TO BE THE SCHIPHOL ID
      departTs: bigint;
      thresholdMin: bigint;
    };

  runtime.log(`SettlementRequested detected`);
  runtime.log(`  marketId     = ${marketId.toString()}`);
  runtime.log(`  flightId     = ${flightId} (expected Schiphol id)`);
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
    // Fail loudly so we don't settle with unknown data
    throw new Error(
      `SchipholById normalization failed: ${source.error ?? "unknown_error"}`,
    );
  }

  // 3) Build evidence + hash
  const generatedAtTs = Math.floor(Date.now() / 1000);
  const { pack, canonicalJson, evidenceHash } = buildEvidencePack({
    workflowName: "flight-delay-workflow",
    workflowVersion: "0.5.0-schiphol-id-only",
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

  // 4) Decide what we settle ONCHAIN
  // We map to a single bool (contract expects bool delayed).
  // Here: "YES" means disruption (cancelled OR diverted OR delay >= threshold).
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

  // 5) Report payload matches FlightMarket.onReport ABI:
  // (uint256 marketId, bool delayed, uiny256 delayMinutes, bytes32 evidenceHash)
  const reportPayloadHex = encodeAbiParameters(
    parseAbiParameters(
      "uint256 marketId, bool delayed, uiny256 delayMinutes, bytes32 evidenceHash",
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

  // 7) Onchain write (dry-run unless simulate --broadcast)
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
  const chainSelectorName = requireString(
    "chainSelectorName",
    raw.chainSelectorName,
  );
  const marketAddress = requireString("marketAddress", raw.marketAddress);
  const receiverAddress = requireString("receiverAddress", raw.receiverAddress);
  requireAddress("marketAddress", marketAddress);
  requireAddress("receiverAddress", receiverAddress);

  // required schiphol config
  raw.schipholBaseUrl = requireString("schipholBaseUrl", raw.schipholBaseUrl);
  raw.schipholResourceVersion = requireString(
    "schipholResourceVersion",
    raw.schipholResourceVersion,
  );

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName,
    isTestnet: true,
  });
  if (!network) throw new Error(`Network not found: ${chainSelectorName}`);
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
