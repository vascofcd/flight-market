export type Config = {
  chainSelectorName: string;
  flightMarketAddr: string;
  gasLimit: string;
  airLabsBaseUrl: string;
  airLabsDelayMetric: "dep" | "arr" | "any";
  matchWindowSeconds: string;
};

export type SettlementResult = {
  marketId: string;
  flightId: string;
  departTs: string;
  thresholdMin: string;
  delayMinutes: number;
  status: string;

  evidenceHash: `0x${string}`;
  evidenceCanonicalJson: string;

  reportPayloadHex: `0x${string}`;
  reportPayloadB64: string;

  writeTxHashHex: `0x${string}`;
  writeTxStatus: string;
  receiverExecutionStatus: string;
  transactionFeeWei: string;
  errorMessage: string;
};

//@todo see this k value
export type AirLabsError = {
  error?: {
    code?: string;
    message?: string;
  };
  [k: string]: unknown;
};

//@todo see this k value
export type AirLabsFlight = {
  flight_iata?: string;
  cs_flight_iata?: string;
  dep_time_ts?: number;
  arr_time_ts?: number;
  delayed?: number | null;
  dep_delayed?: number | null;
  arr_delayed?: number | null;
  status?: string | null;
  [k: string]: unknown;
};

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
    status: string;
    settledAsDisruption: boolean;
  };
  sources: EvidenceSource[];
};
