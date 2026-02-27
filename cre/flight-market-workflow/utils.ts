import { keccak256, toBytes } from "viem";

/**
 * Stable/canonical JSON stringify:
 * - Object keys sorted lexicographically
 * - Arrays preserved in order
 * - BigInt not allowed (convert before calling)
 */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null) return null;

  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const k of keys) out[k] = canonicalize(obj[k]);
    return out;
  }

  // undefined / function / symbol should not appear in evidence packs
  return null;
}

export function sha3HexString(s: string): `0x${string}` {
  return keccak256(toBytes(s));
}

export function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}
