import type { Market } from "./types";

export type MarketStatus =
  | "OPEN"
  | "CLOSED_WAITING_REQUEST"
  | "SETTLEMENT_REQUESTED"
  | "RESOLVED";

export function getMarketStatus(m: Market, nowSec: bigint): MarketStatus {
  if (m.resolved) return "RESOLVED";
  if (nowSec < m.closeTs) return "OPEN";
  if (m.settlementRequestedTs > 0n) return "SETTLEMENT_REQUESTED";
  return "CLOSED_WAITING_REQUEST";
}
