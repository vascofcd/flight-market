import { useMemo } from "react";
import { decodeEventLog } from "viem";
import {
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import {
  FLIGHT_DELAY_MARKET_ABI,
  FLIGHT_DELAY_MARKET_ADDRESS,
} from "../abi/flightMarketAbi";

type CreateMarketArgs = {
  flightId: string;
  departTs: bigint;
  thresholdMin: bigint;
  closeTs: bigint;
};

export function useCreateMarket() {
  const chainId = useChainId();
  const wrongNetwork = chainId !== sepolia.id;

  const {
    data: hash,
    error,
    isPending,
    writeContract,
    reset,
  } = useWriteContract();

  const receiptQuery = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: Boolean(hash),
    },
  });

  const createdMarketId = useMemo(() => {
    const receipt = receiptQuery.data;
    if (!receipt) return null;

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() !== FLIGHT_DELAY_MARKET_ADDRESS.toLowerCase()
      )
        continue;

      try {
        const decoded = decodeEventLog({
          abi: FLIGHT_DELAY_MARKET_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "MarketCreated") {
          return decoded.args.marketId as bigint;
        }
      } catch (e) {
        console.error("Failed to decode log", e);
      }
    }

    return null;
  }, [receiptQuery.data]);

  function createMarket(args: CreateMarketArgs) {
    writeContract({
      address: FLIGHT_DELAY_MARKET_ADDRESS,
      abi: FLIGHT_DELAY_MARKET_ABI,
      functionName: "createMarket",
      args: [args.flightId, args.departTs, args.thresholdMin, args.closeTs],
    });
  }

  return {
    wrongNetwork,
    createMarket,
    reset,
    hash,
    createdMarketId,
    isPending,
    error,
    receipt: receiptQuery.data,
    isConfirming: receiptQuery.isLoading,
    isConfirmed: receiptQuery.isSuccess,
    confirmError: receiptQuery.error,
  };
}
