export type Market = {
  marketId: bigint;
  flightId: string;
  departTs: bigint;
  thresholdMin: bigint;
  closeTs: bigint;
  yesPool: bigint;
  noPool: bigint;
  settlementRequestedTs: bigint;
  resolved: boolean;
  delayed: boolean;
  delayMinutes: bigint;
  evidenceHash: `0x${string}`;
};