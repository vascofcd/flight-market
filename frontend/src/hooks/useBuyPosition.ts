import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  FLIGHT_DELAY_MARKET_ABI,
  FLIGHT_DELAY_MARKET_ADDRESS,
} from "../abi/flightMarketAbi";

export function useBuyPosition() {
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

  function buyYes(marketId: bigint, valueWei: bigint) {
    writeContract({
      address: FLIGHT_DELAY_MARKET_ADDRESS,
      abi: FLIGHT_DELAY_MARKET_ABI,
      functionName: "buyYes",
      args: [marketId],
      value: valueWei,
    });
  }

  function buyNo(marketId: bigint, valueWei: bigint) {
    writeContract({
      address: FLIGHT_DELAY_MARKET_ADDRESS,
      abi: FLIGHT_DELAY_MARKET_ABI,
      functionName: "buyNo",
      args: [marketId],
      value: valueWei,
    });
  }

  return {
    buyYes,
    buyNo,
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
