import { useReadContract } from "wagmi";
import {
  FLIGHT_DELAY_MARKET_ABI,
  FLIGHT_DELAY_MARKET_ADDRESS,
} from "../abi/flightMarketAbi";

export function useMarketCount() {
  return useReadContract({
    address: FLIGHT_DELAY_MARKET_ADDRESS,
    abi: FLIGHT_DELAY_MARKET_ABI,
    functionName: "nextMarketId",
    query: { refetchInterval: 10_000 },
  });
}
