import type {
  EvidencePack,
  EvidenceSource,
  NormalizedFlightStatus,
} from "./types.js";
import { canonicalStringify, sha3HexString } from "./utils.js";

export type EvidenceInputs = {
  workflowName: string;
  workflowVersion: string;
  generatedAtTs: number;
  marketId: string;
  schipholFlightId: string;
  departTs: string;
  thresholdMin: string;
  source: EvidenceSource;
};

export function buildEvidencePack(inputs: EvidenceInputs): {
  pack: EvidencePack;
  canonicalJson: string;
  evidenceHash: `0x${string}`;
} {
  if (!inputs.source.normalized) {
    throw new Error("Cannot build evidence pack: source not normalized");
  }

  const n = inputs.source.normalized as NormalizedFlightStatus;
  const threshold = Number(inputs.thresholdMin);

  const cancelled = n.cancelled;
  const diverted = n.diverted;
  const delayMinutes = n.delayMinutes;

  const status: EvidencePack["computed"]["status"] = cancelled
    ? "CANCELLED"
    : diverted
      ? "DIVERTED"
      : delayMinutes >= threshold
        ? "DELAYED"
        : "ON_TIME";

  const settledAsDisruption =
    cancelled || diverted || delayMinutes >= threshold;

  const scheduledIso = new Date(n.scheduledTs * 1000).toISOString();
  const actualIso = n.actualOrEstimatedTs
    ? new Date(n.actualOrEstimatedTs * 1000).toISOString()
    : "";

  const pack: EvidencePack = {
    schema: "flight.market.evidence.v2",
    workflow: {
      name: inputs.workflowName,
      version: inputs.workflowVersion,
      dataMode: "schiphol_by_id",
      generatedAtTs: inputs.generatedAtTs,
    },
    market: {
      marketId: inputs.marketId,
      schipholFlightId: inputs.schipholFlightId,
      departTs: inputs.departTs,
      thresholdMin: inputs.thresholdMin,
    },
    computed: {
      cancelled,
      diverted,
      delayMinutes,
      thresholdMin: threshold,
      status,
      settledAsDisruption,
    },
    schiphol: {
      flightDirection: n.flightDirection,
      flightStates: n.flightStates,
      usedTimeField: n.usedTimeField,
      scheduledIso,
      actualOrEstimatedIso: actualIso,
    },
    sources: [inputs.source],
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
