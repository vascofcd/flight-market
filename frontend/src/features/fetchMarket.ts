import type { PublicClient } from "viem";
import type { Market } from "./types";
import {
  FLIGHT_DELAY_MARKET_ABI,
  FLIGHT_DELAY_MARKET_ADDRESS,
} from "../abi/flightMarketAbi";

export async function fetchMarket(
  publicClient: PublicClient,
  marketId: bigint,
): Promise<Market> {
  const result = (await publicClient.readContract({
    address: FLIGHT_DELAY_MARKET_ADDRESS,
    abi: FLIGHT_DELAY_MARKET_ABI,
    functionName: "getMarket",
    args: [marketId],
  })) as unknown as [
    string, // flightId
    bigint, // departTs
    bigint, // thresholdMin
    bigint, // closeTs
    bigint, // yesPool
    bigint, // noPool
    bigint, // settlementRequestedTs
    boolean, // resolved
    boolean, // delayed
    bigint, // delayMinutes
    `0x${string}`, // evidenceHash
  ];

  const [
    flightId,
    departTs,
    thresholdMin,
    closeTs,
    yesPool,
    noPool,
    settlementRequestedTs,
    resolved,
    delayed,
    delayMinutes,
    evidenceHash,
  ] = result;

  return {
    marketId,
    flightId,
    departTs,
    thresholdMin,
    closeTs,
    yesPool,
    noPool,
    settlementRequestedTs,
    resolved,
    delayed,
    delayMinutes,
    evidenceHash,
  };
}
