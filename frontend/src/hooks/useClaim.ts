import { useMemo } from "react";
import { decodeEventLog } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  FLIGHT_DELAY_MARKET_ABI,
  FLIGHT_DELAY_MARKET_ADDRESS,
} from "../abi/flightMarketAbi";

export function useClaim() {
  const { data: hash, error, isPending, writeContract, reset } =
    useWriteContract();

  const receiptQuery = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  const payout = useMemo(() => {
    const receipt = receiptQuery.data;
    if (!receipt) return null;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== FLIGHT_DELAY_MARKET_ADDRESS.toLowerCase())
        continue;

      try {
        const decoded = decodeEventLog({
          abi: FLIGHT_DELAY_MARKET_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === "Claimed") {
          return decoded.args.payout as bigint;
        }
      } catch {
        console.log("Failed to decode log", log);
        continue;
      }
    }

    return null;
  }, [receiptQuery.data]);

  function claim(marketId: bigint) {
    writeContract({
      address: FLIGHT_DELAY_MARKET_ADDRESS,
      abi: FLIGHT_DELAY_MARKET_ABI,
      functionName: "claim",
      args: [marketId],
    });
  }

  return {
    claim,
    reset,
    hash,
    error,
    isPending,
    receipt: receiptQuery.data,
    isConfirming: receiptQuery.isLoading,
    isConfirmed: receiptQuery.isSuccess,
    confirmError: receiptQuery.error,
    payout,
  };
}