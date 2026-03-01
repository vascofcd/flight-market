import { useWatchContractEvent } from "wagmi";
import { useQueryClient, type Query } from "@tanstack/react-query";
import {
  FLIGHT_DELAY_MARKET_ABI,
  FLIGHT_DELAY_MARKET_ADDRESS,
} from "../abi/flightMarketAbi";

type ReadContractKeyOptions = {
  address?: string;
};

function isReadContractQueryForAddress(query: Query, address: string): boolean {
  const key = query.queryKey as unknown[];

  if (key.length < 2) return false;
  if (key[0] !== "readContract") return false;

  const opts = key[1];
  if (typeof opts !== "object" || opts === null) return false;

  const maybe = opts as ReadContractKeyOptions;
  const addr = maybe.address?.toLowerCase();
  return addr === address.toLowerCase();
}

export function useMarketCreatedWatcher() {
  const queryClient = useQueryClient();

  useWatchContractEvent({
    address: FLIGHT_DELAY_MARKET_ADDRESS,
    abi: FLIGHT_DELAY_MARKET_ABI,
    eventName: "MarketCreated",
    onLogs: async () => {
      // Invalidate wagmi readContract queries for this contract
      await queryClient.invalidateQueries({
        predicate: (q) =>
          isReadContractQueryForAddress(q, FLIGHT_DELAY_MARKET_ADDRESS),
      });

      // Invalidate our custom markets queries
      await queryClient.invalidateQueries({ queryKey: ["markets"] });
      await queryClient.invalidateQueries({ queryKey: ["market"] });
    },
  });
}
