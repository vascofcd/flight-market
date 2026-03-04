import { parseAbi, keccak256, toBytes } from "viem";

/**
 * ABI + topic helpers for SettlementRequested log trigger decoding.
 */
export const settlementEventAbi = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string flightId, uint256 departTs, uint256 thresholdMin)",
]);

export const SETTLEMENT_EVENT_SIG =
  "SettlementRequested(uint256,string,uint256,uint256)";

export const SETTLEMENT_EVENT_HASH = keccak256(toBytes(SETTLEMENT_EVENT_SIG));
