export const parseMarketId = (value: string | undefined): bigint | null => {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  return BigInt(value);
};
