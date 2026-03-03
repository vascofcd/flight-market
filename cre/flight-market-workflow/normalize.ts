import type { FlightAPIResponse, NormalizedFlightStatus } from "./types.js";
import { clampNonNegative } from "./utils.js";

type MockAirOneShape = {
  provider: "MockAirOne";
  flightId: string;
  scheduledDepartureTs: number;
  actualDepartureTs: number;
  status: string;
  note?: string;
};

type MockSkyTwoShape = {
  provider: "MockSkyTwo";
  flightId: string;
  times: {
    scheduledDepartureTs: number;
    actualDepartureTs: number;
  };
  status: string;
  note?: string;
};

type SchipholSlim = {
  flight: {
    provider: "Schiphol";
    flightDirection: "A" | "D" | "";
    scheduleDateTime: string;
    actualLandingTime: string;
    estimatedLandingTime: string;
    actualOffBlockTime: string;
    publicEstimatedOffBlockTime: string;
    flightName: string;
    mainFlight: string;
    id: string;
    codeshares: string[];
  };
};

function pickActualTimeMs(f: SchipholSlim["flight"]): {
  ms: number;
  field: string;
} {
  // Arrivals
  if (f.flightDirection === "A") {
    if (f.actualLandingTime)
      return {
        ms: Date.parse(f.actualLandingTime),
        field: "actualLandingTime",
      };
    if (f.estimatedLandingTime)
      return {
        ms: Date.parse(f.estimatedLandingTime),
        field: "estimatedLandingTime",
      };
  }

  // Departures
  if (f.flightDirection === "D") {
    if (f.actualOffBlockTime)
      return {
        ms: Date.parse(f.actualOffBlockTime),
        field: "actualOffBlockTime",
      };
    if (f.publicEstimatedOffBlockTime)
      return {
        ms: Date.parse(f.publicEstimatedOffBlockTime),
        field: "publicEstimatedOffBlockTime",
      };
  }

  // Fallback: try any
  if (f.actualLandingTime)
    return { ms: Date.parse(f.actualLandingTime), field: "actualLandingTime" };
  if (f.estimatedLandingTime)
    return {
      ms: Date.parse(f.estimatedLandingTime),
      field: "estimatedLandingTime",
    };
  if (f.actualOffBlockTime)
    return {
      ms: Date.parse(f.actualOffBlockTime),
      field: "actualOffBlockTime",
    };
  if (f.publicEstimatedOffBlockTime)
    return {
      ms: Date.parse(f.publicEstimatedOffBlockTime),
      field: "publicEstimatedOffBlockTime",
    };

  return { ms: NaN, field: "none" };
}

export function normalize(
  provider: string,
  flightId: string,
  resp: FlightAPIResponse,
): NormalizedFlightStatus {
  const raw = JSON.parse(resp.rawJsonString) as unknown;

  if (provider === "MockAirOne") {
    const o = raw as MockAirOneShape;
    const delay = clampNonNegative(
      Math.floor((o.actualDepartureTs - o.scheduledDepartureTs) / 60),
    );
    return {
      provider,
      flightId,
      scheduledDepartureTs: o.scheduledDepartureTs,
      actualDepartureTs: o.actualDepartureTs,
      delayMinutes: delay,
    };
  }

  if (provider === "MockSkyTwo") {
    const o = raw as MockSkyTwoShape;
    const delay = clampNonNegative(
      Math.floor(
        (o.times.actualDepartureTs - o.times.scheduledDepartureTs) / 60,
      ),
    );
    return {
      provider,
      flightId,
      scheduledDepartureTs: o.times.scheduledDepartureTs,
      actualDepartureTs: o.times.actualDepartureTs,
      delayMinutes: delay,
    };
  }

  if (provider === "Schiphol") {
    const o = raw as SchipholSlim;
    if (!o.flight || !o.flight.scheduleDateTime)
      throw new Error("Schiphol response missing scheduleDateTime");

    const scheduledMs = Date.parse(o.flight.scheduleDateTime);
    const actualPick = pickActualTimeMs(o.flight);

    if (!Number.isFinite(scheduledMs))
      throw new Error("Invalid scheduleDateTime");
    if (!Number.isFinite(actualPick.ms))
      throw new Error("No usable actual/estimated time fields");

    const delay = clampNonNegative(
      Math.floor((actualPick.ms - scheduledMs) / 60000),
    );

    // For compatibility with our existing NormalizedFlightStatus fields,
    // we store times in unix seconds.
    return {
      provider,
      flightId,
      scheduledDepartureTs: Math.floor(scheduledMs / 1000),
      actualDepartureTs: Math.floor(actualPick.ms / 1000),
      delayMinutes: delay,
    };
  }

  throw new Error(`No normalizer implemented for provider=${provider}`);
}
