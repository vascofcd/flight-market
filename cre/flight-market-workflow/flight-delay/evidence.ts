import type {
  EvidencePack,
  EvidenceSource,
  NormalizedFlightStatus,
} from "./types.js";
import { canonicalStringify, sha3HexString } from "./utils.js";
import { medianConsensus } from "./consensus.js";

export type EvidenceInputs = {
  workflowName: string;
  workflowVersion: string;
  dataMode: "mock" | "live";
  mockProfile?: string;
  generatedAtTs: number;

  marketId: string;
  flightId: string;
  departTs: string;
  thresholdMin: string;

  sources: EvidenceSource[];
};

export function buildEvidencePack(inputs: EvidenceInputs): {
  pack: EvidencePack;
  canonicalJson: string;
  evidenceHash: `0x${string}`;
} {
  const threshold = Number(inputs.thresholdMin);

  const okSources = inputs.sources.filter((s) => s.ok && s.normalized);
  const delays: Record<string, number> = {};
  const used: string[] = [];

  for (const s of okSources) {
    const d = (s.normalized as NormalizedFlightStatus).delayMinutes;
    delays[s.provider] = d;
    used.push(s.provider);
  }

  const consensusDelayMinutes = medianConsensus(Object.values(delays));
  const delayed = consensusDelayMinutes >= threshold;

  const pack: EvidencePack = {
    schema: "flight.market.evidence.v1",
    workflow: {
      name: inputs.workflowName,
      version: inputs.workflowVersion,
      dataMode: inputs.dataMode,
      mockProfile: inputs.mockProfile,
      generatedAtTs: inputs.generatedAtTs,
    },
    market: {
      marketId: inputs.marketId,
      flightId: inputs.flightId,
      departTs: inputs.departTs,
      thresholdMin: inputs.thresholdMin,
    },
    resolution: {
      metric: "departure_delay_minutes",
      method: "median_of_sources",
      sourcesUsed: used,
      delays,
      consensusDelayMinutes,
      thresholdMin: threshold,
      delayed,
    },
    sources: inputs.sources,
  };

  const canonicalJson = canonicalStringify(pack);
  const evidenceHash = sha3HexString(canonicalJson);

  return { pack, canonicalJson, evidenceHash };
}

export function makeEvidenceSource(
  provider: string,
  statusCode: number,
  rawJson: string,
  normalized?: NormalizedFlightStatus,
  error?: string,
): EvidenceSource {
  const ok = !error && statusCode >= 200 && statusCode < 300 && !!normalized;
  return {
    provider,
    statusCode,
    ok,
    raw: {
      sha3: sha3HexString(rawJson),
      json: rawJson,
    },
    normalized,
    error,
  };
}
