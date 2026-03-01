import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { marketQueryKeys } from "../features/queryKeys";
import { fetchMarket } from "../features/fetchMarket";

export function useMarket(marketId: bigint | null) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey:
      marketId !== null ? marketQueryKeys.one(marketId) : ["market", "null"],
    enabled: Boolean(publicClient) && marketId !== null,
    queryFn: async () => {
      const client = publicClient;
      if (!client || marketId === null)
        throw new Error("Missing client/marketId");
      return fetchMarket(client, marketId);
    },
    refetchInterval: 10_000,
  });
}
