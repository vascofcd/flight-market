import type { Market } from "./types";

export type MarketStatus =
  | "OPEN"
  | "CLOSED WAITING REQUEST"
  | "SETTLEMENT REQUESTED"
  | "RESOLVED";

export function getMarketStatus(m: Market, nowSec: bigint): MarketStatus {
  if (m.resolved) return "RESOLVED";
  if (nowSec < m.closeTs) return "OPEN";
  if (m.settlementRequestedTs > 0n) return "SETTLEMENT REQUESTED";
  return "CLOSED WAITING REQUEST";
}
