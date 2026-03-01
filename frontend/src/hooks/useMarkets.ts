import { useMemo } from "react";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useMarketCount } from "./useMarketCount";
import { marketQueryKeys } from "../features/queryKeys";
import { fetchMarket } from "../features/fetchMarket";
import type { Market } from "../features/types";

const MAX_MARKETS_TO_LOAD = 50;

export function useMarkets() {
  const publicClient = usePublicClient();
  const countQuery = useMarketCount();

  const count = (countQuery.data ?? 0n) as bigint;

  const ids = useMemo(() => {
    const total = Number(count);
    if (total <= 0) return [];

    const start = Math.max(0, total - MAX_MARKETS_TO_LOAD);
    return Array.from({ length: total - start }, (_, i) => BigInt(start + i));
  }, [count]);

  const marketsQuery = useQuery({
    queryKey: marketQueryKeys.list(count),
    enabled: Boolean(publicClient) && countQuery.isSuccess,
    queryFn: async (): Promise<Market[]> => {
      const client = publicClient;
      if (!client) return [];

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            return await fetchMarket(client, id);
          } catch {
            return null; // skip non-existent market ids
          }
        }),
      );

      const items = results.filter((x): x is Market => x !== null);

      return items.sort((a, b) => Number(b.marketId - a.marketId));
    },
    refetchInterval: 10_000,
  });

  return {
    count,
    idsLoaded: ids,
    countQuery,
    marketsQuery,
    truncated: count > BigInt(MAX_MARKETS_TO_LOAD),
    maxLoaded: MAX_MARKETS_TO_LOAD,
  };
}
