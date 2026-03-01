import { env } from "../env";

export const FLIGHT_DELAY_MARKET_ADDRESS = env.marketContractAddress;

export const FLIGHT_DELAY_MARKET_ABI = [
  // -------------------------
  // Errors
  // -------------------------
  { type: "error", name: "NotOwner", inputs: [] },
  { type: "error", name: "ZeroValue", inputs: [] },
  { type: "error", name: "MarketNotFound", inputs: [] },
  { type: "error", name: "MarketClosed", inputs: [] },
  { type: "error", name: "MarketNotClosed", inputs: [] },
  { type: "error", name: "MarketAlreadyResolved", inputs: [] },
  { type: "error", name: "SettlementAlreadyRequested", inputs: [] },
  { type: "error", name: "InvalidCloseTime", inputs: [] },
  { type: "error", name: "StakeCapExceeded", inputs: [] },
  { type: "error", name: "PoolCapExceeded", inputs: [] },
  { type: "error", name: "OnlyForwarder", inputs: [] },
  { type: "error", name: "BadReport", inputs: [] },
  { type: "error", name: "NothingToClaim", inputs: [] },

  // -------------------------
  // Views
  // -------------------------
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

  // -------------------------
  // Writes
  // -------------------------
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

  // -------------------------
  // Events
  // -------------------------
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
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "payout", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;
