export const FLIGHT_MARKET_ABI = [
  // reads
  {
    type: "function",
    name: "nextMarketId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      { name: "flightId", type: "string" },
      { name: "departTs", type: "uint256" },
      { name: "thresholdMin", type: "uint256" },
      { name: "closeTs", type: "uint256" },
      { name: "yesPool", type: "uint256" },
      { name: "noPool", type: "uint256" },
      { name: "settlementRequestedTs", type: "uint256" },
      { name: "resolved", type: "bool" },
      { name: "delayed", type: "bool" },
      { name: "delayMinutes", type: "uint256" },
      { name: "evidenceHash", type: "bytes32" },
    ],
  },
  {
    type: "function",
    name: "getUserPosition",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "yesAmount", type: "uint256" },
      { name: "noAmount", type: "uint256" },
      { name: "hasClaimed", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "isOpen",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "totalPool",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },

  // writes
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
    type: "function",
    name: "buyYes",
    stateMutability: "payable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "buyNo",
    stateMutability: "payable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "requestSettlement",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "payout", type: "uint256" }],
  },

  // events (for decoding receipts)
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" },
      { indexed: false, name: "flightId", type: "string" },
      { indexed: false, name: "departTs", type: "uint256" },
      { indexed: false, name: "thresholdMin", type: "uint256" },
      { indexed: false, name: "closeTs", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "PositionBought",
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "yes", type: "bool" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "SettlementRequested",
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" },
      { indexed: false, name: "flightId", type: "string" },
      { indexed: false, name: "departTs", type: "uint256" },
      { indexed: false, name: "thresholdMin", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "MarketResolved",
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" },
      { indexed: false, name: "delayed", type: "bool" },
      { indexed: false, name: "delayMinutes", type: "uint256" },
      { indexed: false, name: "evidenceHash", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "payout", type: "uint256" },
    ],
  },
] as const;
