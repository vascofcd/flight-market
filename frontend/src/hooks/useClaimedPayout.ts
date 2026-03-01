import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address } from "viem";
import { usePublicClient } from "wagmi";
import { FLIGHT_DELAY_MARKET_ADDRESS } from "../abi/flightMarketAbi";

const SEARCH_BLOCK_WINDOW = 200_000n;

export function useClaimedPayout(args: {
  marketId: bigint;
  user: Address | null;
  enabled: boolean;
}) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["claimedPayout", args.marketId.toString(), args.user ?? "0x0"],
    enabled: Boolean(publicClient) && args.enabled && Boolean(args.user),
    queryFn: async () => {
      const client = publicClient;
      if (!client || !args.user) return null;

      const latest = await client.getBlockNumber();
      const fromBlock =
        latest > SEARCH_BLOCK_WINDOW ? latest - SEARCH_BLOCK_WINDOW : 0n;

      const event = parseAbiItem(
        "event Claimed(uint256 indexed marketId, address indexed user, uint256 payout)",
      );

      const logs = await client.getLogs({
        address: FLIGHT_DELAY_MARKET_ADDRESS,
        event,
        args: { marketId: args.marketId, user: args.user },
        fromBlock,
        toBlock: latest,
      });

      if (logs.length === 0) return null;

      const last = logs[logs.length - 1];
      return last.args.payout ?? null;
    },
    refetchInterval: 15_000,
  });
}
