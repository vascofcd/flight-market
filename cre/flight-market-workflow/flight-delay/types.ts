export type FlightAPIResponse = {
  statusCode: number;
  rawJsonString: string;
};

export type NormalizedFlightStatus = {
  provider: string;
  flightId: string;
  scheduledDepartureTs: number;
  actualDepartureTs: number;
  delayMinutes: number;
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
    metric: "departure_delay_minutes";
    method: "median_of_sources";
    sourcesUsed: string[];
    delays: Record<string, number>; // provider -> delayMinutes
    consensusDelayMinutes: number;
    thresholdMin: number;
    delayed: boolean;
  };
  sources: EvidenceSource[];
};
