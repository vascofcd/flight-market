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

type Config = {
  chainSelectorName: string;
  flightMarketAddress: string;
  receiverAddress: string;
  gasLimit: string;
};

const settlementEventAbi = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uint256 thresholdMin)",
]);

const SETTLEMENT_EVENT_SIG =
  "SettlementRequested(uint256,string,uint256,uint256)";
const SETTLEMENT_EVENT_HASH = keccak256(toBytes(SETTLEMENT_EVENT_SIG));

type SettlementPreview = {
  marketId: string;
  flightId: string;
  departTs: string;
  thresholdMin: string;
  delayMinutes: number;
  delayed: boolean;
  evidenceHash: `0x${string}`;
  reportPayloadHex: `0x${string}`;
  reportPayloadB64: string;
};

function computeStubDelayMinutes(input: {
  marketId: bigint;
  flightId: string;
  departTs: bigint;
}): number {
  const seed = keccak256(
    toBytes(`${input.marketId}|${input.flightId}|${input.departTs}`),
  );
  const n = BigInt(seed) % 181n;
  return Number(n); // safe: <= 180
}

function computeEvidenceHash(
  preview: Omit<SettlementPreview, "evidenceHash">,
): `0x${string}` {
  const s = `marketId=${preview.marketId}|flightId=${preview.flightId}|departTs=${preview.departTs}|delay=${preview.delayMinutes}|delayed=${preview.delayed}`;
  return keccak256(toBytes(s));
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

  const delayMinutes = computeStubDelayMinutes({
    marketId,
    flightId,
    departTs,
  });
  const delayed = delayMinutes >= Number(thresholdMin);

  runtime.log(
    `Computed (stub) delayMinutes=${delayMinutes} => delayed=${delayed}`,
  );

  const basePreview: Omit<SettlementPreview, "evidenceHash"> = {
    marketId: marketId.toString(),
    flightId,
    departTs: departTs.toString(),
    thresholdMin: thresholdMin.toString(),
    delayMinutes,
    delayed,
    reportPayloadHex: "0x",
    reportPayloadB64: "",
  };

  const evidenceHash = computeEvidenceHash(basePreview);

  const reportPayloadHex = encodeAbiParameters(
    parseAbiParameters(
      "uint256 marketId, bool delayed, uint256 delayMinutes, bytes32 evidenceHash",
    ),
    [marketId, delayed, BigInt(delayMinutes), evidenceHash],
  );

  const reportPayloadB64 = hexToBase64(reportPayloadHex);

  runtime.log(`Built report payload (hex): ${reportPayloadHex}`);
  runtime.log(`Built report payload (b64): ${reportPayloadB64}`);

  const reportResponse = runtime
    .report({
      encodedPayload: reportPayloadB64,
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  runtime.log(`Report generated. Not writing onchain yet.`);
  runtime.log(
    `Report metadata keys: ${Object.keys(reportResponse as object).join(", ")}`,
  );

  return {
    ...basePreview,
    evidenceHash,
    reportPayloadHex,
    reportPayloadB64,
  };
};

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  });
  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`);
  }

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
