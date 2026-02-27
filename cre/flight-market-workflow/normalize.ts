import type { FlightAPIResponse, NormalizedFlightStatus } from "./types";
import { clampNonNegative } from "./utils";

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

  throw new Error(`No normalizer implemented for provider=${provider}`);
}
