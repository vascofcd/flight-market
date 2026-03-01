export const marketQueryKeys = {
  list: (count: bigint) => ["markets", count.toString()] as const,
  one: (marketId: bigint) => ["market", marketId.toString()] as const,
};
