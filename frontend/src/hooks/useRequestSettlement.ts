import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  FLIGHT_DELAY_MARKET_ABI,
  FLIGHT_DELAY_MARKET_ADDRESS,
} from "../abi/flightMarketAbi";

export function useRequestSettlement() {
  const {
    data: hash,
    error,
    isPending,
    writeContract,
    reset,
  } = useWriteContract();

  const receiptQuery = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  function requestSettlement(marketId: bigint) {
    writeContract({
      address: FLIGHT_DELAY_MARKET_ADDRESS,
      abi: FLIGHT_DELAY_MARKET_ABI,
      functionName: "requestSettlement",
      args: [marketId],
    });
  }

  return {
    requestSettlement,
    reset,
    hash,
    error,
    isPending,
    receipt: receiptQuery.data,
    isConfirming: receiptQuery.isLoading,
    isConfirmed: receiptQuery.isSuccess,
    confirmError: receiptQuery.error,
  };
}
