import {
  type Runtime,
  Runner,
  getNetwork,
  bytesToHex,
  EVMLog,
  cre
} from "@chainlink/cre-sdk"
import { parseAbi, decodeEventLog, keccak256, toHex } from "viem"
import { type Config, configSchema, FlightAPIResponse } from "./types";
import { fetchFlight } from "./fetchFlight";

const eventAbi = parseAbi(["event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uint256 thresholdMin)"]);
const eventSignature = "SettlementRequested(uint256,string,uint256,uint256)";

const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  try {
    // ========================================
    // Step 1: Decode Event Log
    // ========================================

    const topics = log.topics.map(t => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]];
    const data = bytesToHex(log.data);

    const decodedLog = decodeEventLog({ abi: eventAbi, data, topics });
    runtime.log(`Event name: ${decodedLog.eventName}`);

    const marketId: bigint = decodedLog.args.marketId as bigint;
    runtime.log(`Settlement request detected for Market Id: ${marketId.toString()}`);

    // ========================================
    // Step 2: Fetch Api
    // ========================================


    const result: FlightAPIResponse = fetchFlight(runtime);
    // const result: FlightAPIResponse = {rawJsonString: "{}", statusCode: 200};

    runtime.log(`Successfully sent data to API. Status: ${result.statusCode}`);
    runtime.log(`Raw JSON String for market: ${result.rawJsonString}`);

    return "Settlement Request Processed";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`onLogTrigger error: ${msg}`);
    throw err;
  }
};

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.evms[0].chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Network not found for chain selector name: ${config.evms[0].chainSelectorName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  // const requestSettlementHash = keccak256(toHex(eventSignature));

  return [
    cre.handler(
      evmClient.logTrigger({
        addresses: [config.evms[0].flightMarketAddress],
        // topics: [{ values: [requestSettlementHash] }],
        confidence: "CONFIDENCE_LEVEL_FINALIZED",
      }),
      onLogTrigger
    ),
  ];
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

main();
