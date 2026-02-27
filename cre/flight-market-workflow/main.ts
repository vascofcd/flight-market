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
import { mockAirOne, mockSkyTwo } from "./mockProviders.js";
import { normalize } from "./normalize.js";
import { buildEvidencePack, makeEvidenceSource } from "./evidence.js";

type Config = {
  chainSelectorName: string;
  flightMarketAddress: string;
  receiverAddress: string;
  gasLimit: string;

  dataMode: "mock" | "live";
  mockProfile: string;
};

// event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uint256 thresholdMin);
const settlementEventAbi = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uint256 thresholdMin)",
]);

const SETTLEMENT_EVENT_SIG =
  "SettlementRequested(uint256,string,uint256,uint256)";
const SETTLEMENT_EVENT_HASH = keccak256(toBytes(SETTLEMENT_EVENT_SIG));

function requireStringField(name: keyof Config, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Missing/invalid config field "${String(name)}". ` +
        `Check workflows/flight-delay/workflow.yaml config-path and the JSON file it points to.`,
    );
  }
  return value;
}

function requireEnumField<T extends string>(
  name: keyof Config,
  value: unknown,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(
      `Missing/invalid config field "${String(name)}". Expected one of: ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}

function mustBeHexAddress(label: string, addr: string) {
  if (typeof addr !== "string")
    throw new Error(`${label} must be a string address, got ${typeof addr}`);
  if (!addr.startsWith("0x") || addr.length !== 42) {
    throw new Error(`${label} must be 0x + 40 hex chars. Got: ${addr}`);
  }
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
  reportPayloadB64: string;
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
  mockProfile: string,
): Array<{ provider: string; resp: FlightAPIResponse }> {
  runtime.log(`Phase E: using MOCK providers only (profile=${mockProfile})`);
  const ctx = { flightId, departTs, mockProfile };
  return [
    { provider: "MockAirOne", resp: mockAirOne(ctx) },
    { provider: "MockSkyTwo", resp: mockSkyTwo(ctx) },
  ];
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

  const decoded = decodeEventLog({
    abi: settlementEventAbi,
    data,
    topics,
  });

  if (decoded.eventName !== "SettlementRequested") {
    throw new Error(`Unexpected event: ${decoded.eventName}`);
  }

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

  if (runtime.config.dataMode !== "mock") {
    throw new Error(
      `Phase E is mock-only right now. Set config.dataMode="mock".`,
    );
  }

  // 1) Mock “requests”
  const mockResults = runMockRequests(
    runtime,
    flightId,
    Number(departTs),
    runtime.config.mockProfile,
  );

  // 2) Normalize + evidence sources
  const sources = mockResults.map(({ provider, resp }) => {
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

  // 3) Build Evidence Pack + hash
  const generatedAtTs = Math.floor(Date.now() / 1000);
  const { canonicalJson, evidenceHash, pack } = buildEvidencePack({
    workflowName: "flight-delay-workflow",
    workflowVersion: "0.3.0-phase-e-write",
    dataMode: "mock",
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

  // 4) Build report payload for FlightMarket.onReport(report)
  // ABI: (uint256 marketId, bool delayed, uint256 delayMinutes, bytes32 evidenceHash)
  const reportPayloadHex = encodeAbiParameters(
    parseAbiParameters(
      "uint256 marketId, bool delayed, uint256 delayMinutes, bytes32 evidenceHash",
    ),
    [marketId, delayed, BigInt(delayMinutes), evidenceHash],
  );
  const reportPayloadB64 = hexToBase64(reportPayloadHex);

  runtime.log(`Built report payload (hex): ${reportPayloadHex}`);
  runtime.log(`Built report payload (b64): ${reportPayloadB64}`);

  // 5) Generate signed report
  const reportResponse = runtime
    .report({
      encodedPayload: reportPayloadB64,
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  runtime.log(
    `Report generated. Submitting onchain via evmClient.writeReport...`,
  );

  // 6) PHASE E: submit report onchain (dry-run unless CLI uses --broadcast)
  // writeReport signature: receiver + report + optional gasConfig :contentReference[oaicite:2]{index=2}
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
  const writeTxStatus = (writeResult.txStatus ??
    "UNKNOWN") as unknown as string;
  const receiverExecutionStatus =
    (writeResult.receiverContractExecutionStatus ?? "UNKNOWN") as string;
  const transactionFeeWei = (
    (writeResult.transactionFee ?? 0n) as bigint
  ).toString();
  const errorMessage = (writeResult.errorMessage ?? "") as string;

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

const initWorkflow = (rawConfig: Config) => {
  // Validate config early
  const chainSelectorName = requireStringField(
    "chainSelectorName",
    (rawConfig as any).chainSelectorName,
  );
  const flightMarketAddress = requireStringField(
    "flightMarketAddress",
    (rawConfig as any).flightMarketAddress,
  );
  const receiverAddress = requireStringField(
    "receiverAddress",
    (rawConfig as any).receiverAddress,
  );
  const gasLimit = requireStringField("gasLimit", (rawConfig as any).gasLimit);
  const dataMode = requireEnumField("dataMode", (rawConfig as any).dataMode, [
    "mock",
    "live",
  ] as const);
  const mockProfile = requireStringField(
    "mockProfile",
    (rawConfig as any).mockProfile,
  );

  const config: Config = {
    chainSelectorName,
    flightMarketAddress,
    receiverAddress,
    gasLimit,
    dataMode,
    mockProfile,
  };

  mustBeHexAddress("flightMarketAddress", config.flightMarketAddress);
  mustBeHexAddress("receiverAddress", config.receiverAddress);

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  });
  if (!network)
    throw new Error(`Network not found: ${config.chainSelectorName}`);

  const evmClient = new EVMClient(network.chainSelector.selector);

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.flightMarketAddress)],
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
