import { keccak256, toBytes } from "viem";
import type { FlightAPIResponse } from "./types";

/**
 * Mock provider responses.
 * They are deterministic based on (flightId + departTs + mockProfile).
 * This replaces real HTTP calls for Phase D.
 */
export type MockContext = {
  flightId: string;
  departTs: number;
  mockProfile: string;
};

function baseDelayMinutes(ctx: MockContext): number {
  // deterministic [0..180]
  const seed = keccak256(
    toBytes(`${ctx.mockProfile}|${ctx.flightId}|${ctx.departTs}`),
  );
  const n = BigInt(seed) % 181n;
  return Number(n);
}

function makeResponse(obj: unknown): FlightAPIResponse {
  return {
    statusCode: 200,
    rawJsonString: JSON.stringify(obj),
  };
}

/**
 * Provider A: "MockAirOne"
 * Slightly biased down (-3 minutes) vs base.
 */
export function mockAirOne(ctx: MockContext): FlightAPIResponse {
  const delay = Math.max(0, baseDelayMinutes(ctx) - 3);
  const scheduled = ctx.departTs;
  const actual = ctx.departTs + delay * 60;

  return makeResponse({
    provider: "MockAirOne",
    flightId: ctx.flightId,
    scheduledDepartureTs: scheduled,
    actualDepartureTs: actual,
    status: delay === 0 ? "on_time" : "departed_late",
    note: "MOCK_ONLY_PHASE_D",
  });
}

/**
 * Provider B: "MockSkyTwo"
 * Slightly biased up (+4 minutes) vs base.
 */
export function mockSkyTwo(ctx: MockContext): FlightAPIResponse {
  const delay = Math.min(180, baseDelayMinutes(ctx) + 4);
  const scheduled = ctx.departTs;
  const actual = ctx.departTs + delay * 60;

  return makeResponse({
    provider: "MockSkyTwo",
    flightId: ctx.flightId,
    times: {
      scheduledDepartureTs: scheduled,
      actualDepartureTs: actual,
    },
    status: delay === 0 ? "on_time" : "delayed",
    note: "MOCK_ONLY_PHASE_D",
  });
}
