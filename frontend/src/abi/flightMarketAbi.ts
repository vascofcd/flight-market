import { env } from "../env";

export const FLIGHT_DELAY_MARKET_ADDRESS = env.marketContractAddress;

export const FLIGHT_DELAY_MARKET_ABI = [
  {
    type: "function",
    name: "createMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "flightId", type: "string" },
      { name: "departTs", type: "uint256" },
      { name: "thresholdMin", type: "uint256" },
      { name: "closeTs", type: "uint256" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "flightId", type: "string", indexed: false },
      { name: "departTs", type: "uint256", indexed: false },
      { name: "thresholdMin", type: "uint256", indexed: false },
      { name: "closeTs", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;
