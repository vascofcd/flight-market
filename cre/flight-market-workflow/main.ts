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
import { fetchSchipholFlight } from "./providers/schiphol.js";
import { mockAirOne, mockSkyTwo } from "./providers/mockProviders.js";

type Config = {
  chainSelectorName: string;
  marketAddress: string;
  receiverAddress: string;
  gasLimit: string;

  dataMode: "mock" | "schiphol" | "live";

  // mock
  mockProfile?: string;

  // schiphol
  schipholBaseUrl?: string;
  schipholResourceVersion?: string;
  schipholWindowSeconds?: string;
};

// event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uint256 thresholdMin);
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
  if (!addr.startsWith("0x") || addr.length !== 42)
    throw new Error(`${label} must be 0x + 40 hex chars`);
}

type SettlementPreview = {
  marketId: string;
  flightId: string;
  departTs: string;
  thresholdMin: string;
  delayMinutes: number;
  delayed: boolean;
  evidenceHash: `0x${string}`;
  evidenceCanonicalJson: string;
  reportPayloadHex: `0x${string}`;
  reportPayloadB64: `0x${string}` | string;

  // ALWAYS defined (no undefined/null)
  writeTxHashHex: `0x${string}`;
  writeTxStatus: string;
  receiverExecutionStatus: string;
  transactionFeeWei: string;
  errorMessage: string;
};

function runMockRequests(
  runtime: Runtime<Config>,
  flightId: string,
  departTs: number,
): Array<{ provider: string; resp: FlightAPIResponse }> {
  const profile = runtime.config.mockProfile ?? "default";
  runtime.log(`Using MOCK providers only (profile=${profile})`);
  const ctx = { flightId, departTs, mockProfile: profile };
  return [
    { provider: "MockAirOne", resp: mockAirOne(ctx) },
    { provider: "MockSkyTwo", resp: mockSkyTwo(ctx) },
  ];
}

function runSchipholRequest(
  runtime: Runtime<Config>,
  flightId: string,
  departTs: number,
): Array<{ provider: string; resp: FlightAPIResponse }> {
  const baseUrl =
    runtime.config.schipholBaseUrl ?? "https://api.schiphol.nl/public-flights";
  const resourceVersion = runtime.config.schipholResourceVersion ?? "v4";
  const windowSeconds = Number(runtime.config.schipholWindowSeconds ?? "43200");

  const appId = runtime.getSecret({ id: "SCHIPHOL_APP_ID" }).result().value;
  const appKey = runtime.getSecret({ id: "SCHIPHOL_APP_KEY" }).result().value;
  if (!appId || !appKey)
    throw new Error(
      "Missing Schiphol secrets: SCHIPHOL_APP_ID / SCHIPHOL_APP_KEY",
    );

  const headers: Record<string, string> = {
    accept: "application/json",
    ResourceVersion: resourceVersion,
    app_id: appId,
    app_key: appKey,
  };

  // Provider handles lookup (if needed) and then always calls /flights/{id}
  const resp = fetchSchipholFlight(runtime, {
    headers,
    flightId,
    departTs,
    cfg: {
      schipholBaseUrl: baseUrl,
      schipholResourceVersion: resourceVersion,
      schipholWindowSeconds: windowSeconds,
    },
  });

  return [{ provider: "Schiphol", resp }];
}

const onSettlementRequested = (
  runtime: Runtime<Config>,
  log: EVMLog,
): SettlementPreview => {
  const topics = log.topics.map((t) => bytesToHex(t)) as [
    `0x${string}`,
    ...`0x${string}`[],
  ];
  const data = bytesToHex(log.data);

  // Guard against selecting the wrong log index
  const topic0 = topics[0]?.toLowerCase();
  const expected = SETTLEMENT_EVENT_HASH.toLowerCase();
  if (topic0 !== expected) {
    throw new Error(
      `Wrong log selected. Expected SettlementRequested topic0=${expected} but got ${topic0}. ` +
        `Use the requestSettlement tx hash and pick the correct log index.`,
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

  runtime.log(`SettlementRequested detected`);
  runtime.log(`  marketId      = ${marketId.toString()}`);
  runtime.log(`  flightId      = ${flightId}`);
  runtime.log(`  departTs      = ${departTs.toString()}`);
  runtime.log(`  thresholdMin  = ${thresholdMin.toString()}`);

  // 1) Fetch data
  let results: Array<{ provider: string; resp: FlightAPIResponse }> = [];
  if (runtime.config.dataMode === "mock") {
    results = runMockRequests(runtime, flightId, Number(departTs));
  } else if (runtime.config.dataMode === "live") {
    results = runSchipholRequest(runtime, flightId, Number(departTs));
  } else {
    throw new Error(`dataMode=${runtime.config.dataMode} not implemented yet`);
  }

  // 2) Normalize + evidence sources
  const sources = results.map(({ provider, resp }) => {
    try {
      const normalized = normalize(provider, flightId, resp);
      return makeEvidenceSource(
        provider,
        resp.statusCode,
        resp.rawJsonString,
        normalized,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return makeEvidenceSource(
        provider,
        resp.statusCode,
        resp.rawJsonString,
        undefined,
        msg,
      );
    }
  });

  // 3) Evidence + hash
  const generatedAtTs = Math.floor(Date.now() / 1000);
  const { canonicalJson, evidenceHash, pack } = buildEvidencePack({
    workflowName: "flight-delay-workflow",
    workflowVersion: "0.4.1-schiphol-by-id",
    dataMode: runtime.config.dataMode,
    mockProfile: runtime.config.mockProfile,
    generatedAtTs,

    marketId: marketId.toString(),
    flightId,
    departTs: departTs.toString(),
    thresholdMin: thresholdMin.toString(),

    sources,
  });

  runtime.log(`EvidenceHash: ${evidenceHash}`);
  runtime.log(`EvidencePack (canonical JSON):`);
  runtime.log(canonicalJson);

  const delayMinutes = pack.resolution.consensusDelayMinutes;
  const delayed = pack.resolution.delayed;
  runtime.log(`Consensus delayMinutes=${delayMinutes} => delayed=${delayed}`);

  // 4) Report payload
  const reportPayloadHex = encodeAbiParameters(
    parseAbiParameters(
      "uint256 marketId, bool delayed, uint256 delayMinutes, bytes32 evidenceHash",
    ),
    [marketId, delayed, BigInt(delayMinutes), evidenceHash],
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

  // 6) Onchain write (dry-run unless --broadcast)
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
    delayed,
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
