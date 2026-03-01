import { formatEther } from "viem";

export function formatEth(wei: bigint): string {
  return formatEther(wei);
}

export function formatUnixSeconds(sec: bigint): string {
  const ms = Number(sec) * 1000;
  return new Date(ms).toLocaleString();
}
