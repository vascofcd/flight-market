import type { FlightAPIResponse, NormalizedFlightStatus } from "./types.js";
import { clampNonNegative } from "./utils.js";

type SchipholPublicFlightState = {
  flightStates?: string[];
};

type SchipholFlight = {
  id?: string;
  flightName?: string;
  mainFlight?: string;
  flightDirection?: "A" | "D";
  scheduleDateTime?: string;
  actualLandingTime?: string;
  estimatedLandingTime?: string;
  actualOffBlockTime?: string;
  publicEstimatedOffBlockTime?: string;

  publicFlightState?: SchipholPublicFlightState;
};

function pickActualOrEstimated(f: SchipholFlight): {
  iso: string;
  field: string;
} {
  const dir = f.flightDirection ?? "?";

  if (dir === "A") {
    if (f.actualLandingTime)
      return { iso: f.actualLandingTime, field: "actualLandingTime" };
    if (f.estimatedLandingTime)
      return { iso: f.estimatedLandingTime, field: "estimatedLandingTime" };
  }

  if (dir === "D") {
    if (f.actualOffBlockTime)
      return { iso: f.actualOffBlockTime, field: "actualOffBlockTime" };
    if (f.publicEstimatedOffBlockTime)
      return {
        iso: f.publicEstimatedOffBlockTime,
        field: "publicEstimatedOffBlockTime",
      };
  }

  if (f.actualLandingTime)
    return { iso: f.actualLandingTime, field: "actualLandingTime" };
  if (f.estimatedLandingTime)
    return { iso: f.estimatedLandingTime, field: "estimatedLandingTime" };
  if (f.actualOffBlockTime)
    return { iso: f.actualOffBlockTime, field: "actualOffBlockTime" };
  if (f.publicEstimatedOffBlockTime)
    return {
      iso: f.publicEstimatedOffBlockTime,
      field: "publicEstimatedOffBlockTime",
    };

  throw new Error(
    "No usable actual/estimated time field found (flight not ready)",
  );
}

export function normalize(
  provider: string,
  marketFlightId: string,
  resp: FlightAPIResponse,
): NormalizedFlightStatus {
  if (provider !== "SchipholById") {
    throw new Error(`No normalizer implemented for provider=${provider}`);
  }

  const rawObj = JSON.parse(resp.rawJsonString) as any;
  const f: SchipholFlight = rawObj?.flight ?? rawObj;

  const states = (f.publicFlightState?.flightStates ?? []).filter(
    (x) => typeof x === "string",
  );
  const cancelled = states.includes("CNX");
  const diverted = states.includes("DIV");

  if (!f.scheduleDateTime) throw new Error("Missing scheduleDateTime");
  const scheduledMs = Date.parse(f.scheduleDateTime);
  if (!Number.isFinite(scheduledMs))
    throw new Error("Invalid scheduleDateTime");

  let actualIso = "";
  let usedField = "";
  let actualMs = NaN;

  try {
    const pick = pickActualOrEstimated(f);
    actualIso = pick.iso;
    usedField = pick.field;
    actualMs = Date.parse(actualIso);
  } catch {
    if (!cancelled && !diverted) {
      throw new Error(
        "Flight not ready: missing actual/estimated time and not CNX/DIV",
      );
    }
  }

  const delay = Number.isFinite(actualMs)
    ? clampNonNegative(Math.floor((actualMs - scheduledMs) / 60000))
    : 0;

  return {
    provider,
    schipholId: (f.id ?? marketFlightId) || marketFlightId,
    flightName: f.flightName ?? f.mainFlight ?? "",
    flightDirection: f.flightDirection ?? "?",
    flightStates: states,

    scheduledTs: Math.floor(scheduledMs / 1000),
    actualOrEstimatedTs: Number.isFinite(actualMs)
      ? Math.floor(actualMs / 1000)
      : 0,
    usedTimeField:
      usedField ||
      (cancelled
        ? "cancelled_no_time"
        : diverted
          ? "diverted_no_time"
          : "unknown"),

    delayMinutes: delay,
    cancelled,
    diverted,
  };
}
