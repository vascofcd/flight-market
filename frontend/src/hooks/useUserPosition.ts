import { useAccount, useReadContract } from "wagmi";
import {
  FLIGHT_DELAY_MARKET_ABI,
  FLIGHT_DELAY_MARKET_ADDRESS,
} from "../abi/flightMarketAbi";

export function useUserPosition(marketId: bigint | null) {
  const { address } = useAccount();

  const query = useReadContract({
    address: FLIGHT_DELAY_MARKET_ADDRESS,
    abi: FLIGHT_DELAY_MARKET_ABI,
    functionName: "getUserPosition",
    args: marketId !== null && address ? [marketId, address] : undefined,
    query: {
      enabled: marketId !== null && Boolean(address),
      refetchInterval: 10_000,
    },
  });

  const data = query.data as readonly [bigint, bigint, boolean] | undefined;

  return {
    address,
    yesAmount: data?.[0] ?? 0n,
    noAmount: data?.[1] ?? 0n,
    hasClaimed: data?.[2] ?? false,
    query,
  };
}
