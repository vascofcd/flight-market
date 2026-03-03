export type FlightAPIResponse = {
  statusCode: number;
  rawJsonString: string;
};

export type NormalizedFlightStatus = {
  provider: string;
  schipholId: string;
  flightName: string;
  flightDirection: "A" | "D" | "?";
  flightStates: string[];

  scheduledTs: number;
  actualOrEstimatedTs: number;
  usedTimeField: string;

  delayMinutes: number;
  cancelled: boolean;
  diverted: boolean;
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
  schema: "flight.market.evidence.v2";
  workflow: {
    name: string;
    version: string;
    dataMode: "schiphol_by_id";
    generatedAtTs: number;
  };
  market: {
    marketId: string;
    schipholFlightId: string;
    departTs: string;
    thresholdMin: string;
  };
  computed: {
    cancelled: boolean;
    diverted: boolean;
    delayMinutes: number;
    thresholdMin: number;
    status: "CANCELLED" | "DIVERTED" | "DELAYED" | "ON_TIME";
    settledAsDisruption: boolean;
  };
  schiphol: {
    flightDirection: "A" | "D" | "?";
    flightStates: string[];
    usedTimeField: string;
    scheduledIso: string;
    actualOrEstimatedIso: string;
  };
  sources: EvidenceSource[];
};
