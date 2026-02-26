import { parseAbi } from "viem";

export const FlightMarket = [
  {
    inputs: [],
    name: "get",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const settlementEventAbi = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string flightId, uint64 departTs, uint32 thresholdMin)",
]);
