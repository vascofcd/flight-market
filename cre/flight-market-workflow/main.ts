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
import { decodeEventLog, encodeAbiParameters, parseAbiParameters } from "viem";
import { fetchAirLabsFlight } from "./integrations/airLabsDelays";
import { writeToFirestore } from "./integrations/firebase";
import {
  settlementEventAbi,
  SETTLEMENT_EVENT_HASH,
} from "./contract/settlementEvent";
import { normalizeAirLabsFlight } from "./lib/normalize";
import { buildEvidencePack, makeEvidenceSource } from "./lib/evidence";
import { getAirLabsApiKey } from "./helpers";
import type {
  Config,
  FirestoreWriteResponse,
  FlightAPIResponse,
  SettlementResult,
} from "./types";

/**
 *
 * @param runtime
 * @param flightIata
 * @returns
 */
const fetchFlight = (
  runtime: Runtime<Config>,
  flightIata: string,
): FlightAPIResponse => {
  return fetchAirLabsFlight(runtime, {
    baseUrl: runtime.config.airLabsBaseUrl,
    apiKey: getAirLabsApiKey(runtime),
    flightIata,
  });
};

/**
 *
 * @param runtime
 * @param log
 * @returns
 */
const onSettlementRequested = (
  runtime: Runtime<Config>,
  log: EVMLog,
): SettlementResult => {
  // ------------------------------------------------
  //    1: Decode SettlementRequested event
  // ------------------------------------------------
  const topics = log.topics.map((t) => bytesToHex(t)) as [
    `0x${string}`,
    ...`0x${string}`[],
  ];
  const data = bytesToHex(log.data);
  const topic = topics[0]?.toLowerCase();
  const expected = SETTLEMENT_EVENT_HASH.toLowerCase();

  if (topic !== expected) {
    throw new Error(
      `Wrong log selected. Expected SettlementRequested topic=${expected} but got ${topic}.`,
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
  const delayMetric = runtime.config.airLabsDelayMetric;

  runtime.log(`SettlementRequested detected`);
  runtime.log(`  marketId     = ${marketId.toString()}`);
  runtime.log(`  flightId     = ${flightId}`);
  runtime.log(`  departTs     = ${departTs.toString()}`);
  runtime.log(`  thresholdMin = ${thresholdMin.toString()}`);

  //@todo remove delayMetric, always departure
  runtime.log(`  delayMetric  = ${delayMetric}`);

  // ------------------------------------------------
  //    2: API from AirLabs fetches the flight
  // ------------------------------------------------
  const resp = fetchFlight(runtime, flightId);

  let normalized;
  let sourceError: string | undefined;

  // ------------------------------------------------
  //    3: Normalize
  // ------------------------------------------------
  try {
    normalized = normalizeAirLabsFlight({
      flightId,
      departTs: depart,
      matchWindowSeconds: windowSeconds,
      delayMetric,
      resp,
    });

    //@todo decide if enforce this
    // if (!normalized.withinWindow) {
    //   throw new Error(
    //     `AirLabs flight dep_time_ts is too far from market departTs. diffSeconds=${normalized.departTsDiffSeconds}, window=${windowSeconds}`,
    //   );
    // }
  } catch (e) {
    sourceError = e instanceof Error ? e.message : String(e);
  }

  // ------------------------------------------------
  //    4: Build evidence
  // ------------------------------------------------
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

  const generatedAtTs = Math.floor(Date.now() / 1000);

  const { canonicalJson, evidenceHash } = buildEvidencePack({
    workflowName: "flight-delay-workflow",
    workflowVersion: "", //@todo add version
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

  // ---------------------------------------------------------
  //    5: Submits on-chain settlement in `MarketFlight.sol`
  // ---------------------------------------------------------
  const delayMinutes = normalized.delayMinutes;
  const status = normalized.status;
  const settledAsDisruption = delayMinutes >= threshold;

  const reportPayloadHex = encodeAbiParameters(
    parseAbiParameters(
      "uint256 marketId, bool delayed, uint256 delayMinutes, bytes32 evidenceHash",
    ),
    [marketId, settledAsDisruption, BigInt(delayMinutes), evidenceHash],
  );
  const reportPayloadB64 = hexToBase64(reportPayloadHex);

  const reportResponse = runtime
    .report({
      encodedPayload: reportPayloadB64,
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Network not found: ${runtime.config.chainSelectorName}`);
  }

  runtime.log(
    `Settling Flight Market contract at: ${runtime.config.flightMarketAddr}`,
  );

  const evmClient = new EVMClient(network.chainSelector.selector);

  runtime.log(`Waiting for write report... (marketId: ${marketId})`);

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.flightMarketAddr,
      report: reportResponse,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result();

  const txHashHex = bytesToHex(
    writeResult.txHash ?? new Uint8Array(32),
  ) as `0x${string}`;

  const errorMessage = String(writeResult.errorMessage ?? "");

  runtime.log(`Write report tx hash: ${txHashHex}`);

  if (errorMessage.length > 0) {
    runtime.log(`ErrorMessage=${errorMessage}`);
  }

  // ------------------------------------------------
  //    4: Saves to firestore
  // ------------------------------------------------
  const firestoreResult: FirestoreWriteResponse = writeToFirestore(
    runtime,
    txHashHex,
    flightId,
    resp,
  );

  runtime.log(`Firestore Document: ${firestoreResult.name}`);

  return {
    marketId: marketId.toString(),
    flightId,
    departTs: departTs.toString(),
    thresholdMin: thresholdMin.toString(),
    delayMinutes,
    status,
    evidenceHash,
    evidenceCanonicalJson: canonicalJson,
    reportPayloadHex,
    reportPayloadB64,
    writeTxHashHex: txHashHex,
    errorMessage,
  };
};

/**
 *
 * @param raw
 * @returns
 */
const initWorkflow = (raw: Config) => {
  //@todo add schema
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: raw.chainSelectorName,
    isTestnet: true,
  });

  if (!network) throw new Error(`Network not found: ${raw.chainSelectorName}`);

  const evmClient = new EVMClient(network.chainSelector.selector);

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(raw.flightMarketAddr)],
      }),
      onSettlementRequested,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
