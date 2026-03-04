import type {
  EvidencePack,
  EvidenceSource,
  NormalizedFlightStatus,
} from "../types";
import { canonicalStringify, sha3HexString } from "../utils";

export function makeEvidenceSource(
  provider: string,
  statusCode: number,
  rawJson: string,
  query: { flight_iata: string },
  normalized?: NormalizedFlightStatus,
  error?: string,
): EvidenceSource {
  const previewLen = 2000;
  const jsonPreview =
    rawJson.length > previewLen ? rawJson.slice(0, previewLen) : rawJson;

  const ok = !error && statusCode >= 200 && statusCode < 300;

  return {
    provider,
    statusCode,
    ok,
    query,
    raw: {
      sha3: sha3HexString(rawJson),
      jsonPreview,
      jsonLength: rawJson.length,
    },
    normalized,
    error,
  };
}

export function buildEvidencePack(inputs: {
  workflowName: string;
  workflowVersion: string;
  generatedAtTs: number;

  marketId: string;
  flightId: string;
  departTs: string;
  thresholdMin: string;

  matchWindowSeconds: number;
  delayMetric: "dep" | "arr" | "any";

  normalized: NormalizedFlightStatus;
  sources: EvidenceSource[];
}): { pack: EvidencePack; canonicalJson: string; evidenceHash: `0x${string}` } {
  const threshold = Number(inputs.thresholdMin);

  const delayMinutes = inputs.normalized.delayMinutes;
  const status = inputs.normalized.status;

  const settledAsDisruption = delayMinutes >= threshold;

  const pack: EvidencePack = {
    schema: "flight.market.evidence.v4",
    workflow: {
      name: inputs.workflowName,
      version: inputs.workflowVersion,
      dataMode: "airlabs_flight",
      generatedAtTs: inputs.generatedAtTs,
    },
    market: {
      marketId: inputs.marketId,
      flightId: inputs.flightId,
      departTs: inputs.departTs,
      thresholdMin: inputs.thresholdMin,
    },
    selection: {
      matchWindowSeconds: inputs.matchWindowSeconds,
      delayMetric: inputs.delayMetric,
    },
    computed: {
      delayMinutes,
      thresholdMin: threshold,
      status,
      settledAsDisruption,
    },
    sources: inputs.sources,
  };

  const canonicalJson = canonicalStringify(pack);
  const evidenceHash = sha3HexString(canonicalJson);
  
  return { pack, canonicalJson, evidenceHash };
}
