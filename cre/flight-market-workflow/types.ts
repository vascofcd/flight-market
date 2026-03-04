export type FlightAPIResponse = {
  statusCode: number;
  rawJsonString: string;
};

export type NormalizedFlightStatus = {
  provider: "AirLabsFlight";
  flightId: string; // market flightId, expected to be flight_iata (e.g. "AA6")

  apiFlightIata: string;
  apiCsFlightIata: string;

  depTimeTs: number; // scheduled departure (unix seconds)
  arrTimeTs: number; // scheduled arrival (unix seconds)

  delayMetric: "dep" | "arr" | "any";
  delayFieldUsed: "dep_delayed" | "arr_delayed" | "delayed" | "none";
  delayMinutes: number;

  status: string;
  cancelled: boolean;
  diverted: boolean;

  // sanity check
  withinWindow: boolean;
  departTsDiffSeconds: number;
};

export type EvidenceSource = {
  provider: string;
  statusCode: number;
  ok: boolean;
  query: {
    flight_iata: string;
  };
  raw: {
    sha3: `0x${string}`;
    jsonPreview: string;
    jsonLength: number;
  };
  normalized?: NormalizedFlightStatus;
  error?: string;
};

export type EvidencePack = {
  schema: "flight.market.evidence.v4";
  workflow: {
    name: string;
    version: string;
    dataMode: "airlabs_flight";
    generatedAtTs: number;
  };
  market: {
    marketId: string;
    flightId: string;
    departTs: string;
    thresholdMin: string;
  };
  selection: {
    matchWindowSeconds: number;
    delayMetric: "dep" | "arr" | "any";
  };
  computed: {
    delayMinutes: number;
    thresholdMin: number;
    cancelled: boolean;
    diverted: boolean;
    status: string;

    // "YES" = disruption (cancelled OR diverted OR delay>=threshold)
    settledAsDisruption: boolean;
  };
  sources: EvidenceSource[];
};
