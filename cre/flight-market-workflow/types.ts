export type FlightAPIResponse = {
  statusCode: number;
  rawJsonString: string;
};

export type NormalizedFlightStatus = {
  provider: string;
  flightId: string;
  scheduledDepartureTs: number; // unix seconds
  actualDepartureTs: number; // unix seconds
  delayMinutes: number; // >= 0
};

export type EvidenceSource = {
  provider: string;
  statusCode: number;
  ok: boolean;
  raw: {
    sha3: `0x${string}`;
    json: string;
  };
  normalized?: NormalizedFlightStatus;
  error?: string;
};

export type EvidencePack = {
  schema: "flight.market.evidence.v1";
  workflow: {
    name: string;
    version: string;
    dataMode: "mock" | "live";
    mockProfile?: string;
    generatedAtTs: number;
  };
  market: {
    marketId: string;
    flightId: string;
    departTs: string;
    thresholdMin: string;
  };
  resolution: {
    metric: "schedule_to_actual_minutes";
    method: "median_of_sources";
    sourcesUsed: string[];
    delays: Record<string, number>;
    consensusDelayMinutes: number;
    thresholdMin: number;
    delayed: boolean;
  };
  sources: EvidenceSource[];
};
