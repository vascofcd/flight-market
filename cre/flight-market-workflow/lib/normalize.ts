import type { FlightAPIResponse, NormalizedFlightStatus } from "../types.js"

type AirlabsError = {
  error?: {
    code?: string
    message?: string
  }
  // sometimes APIs include extra fields like request, terms, etc
  [k: string]: unknown
}

type AirlabsFlight = {
  flight_iata?: string
  cs_flight_iata?: string
  dep_time_ts?: number
  arr_time_ts?: number
  delayed?: number | null
  dep_delayed?: number | null
  arr_delayed?: number | null
  status?: string | null
  // allow unknown keys
  [k: string]: unknown
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function toUpper(v: unknown): string {
  return typeof v === "string" ? v.toUpperCase() : ""
}

function statusFlags(statusRaw: string): { cancelled: boolean; diverted: boolean; status: string } {
  const s = (statusRaw || "UNKNOWN").toString().toLowerCase()
  const cancelled = s.includes("cancel")
  const diverted = s.includes("divert")
  return { cancelled, diverted, status: s.toUpperCase() }
}

function pickDelayMinutes(
  metric: "dep" | "arr" | "any",
  dep: number | null,
  arr: number | null,
  any: number | null
): { minutes: number; field: NormalizedFlightStatus["delayFieldUsed"] } {
  const pick = (x: number | null, field: NormalizedFlightStatus["delayFieldUsed"]) =>
    x !== null ? { minutes: Math.max(0, Math.floor(x)), field } : null

  if (metric === "dep") {
    return (
      pick(dep, "dep_delayed") ??
      pick(any, "delayed") ??
      pick(arr, "arr_delayed") ?? { minutes: 0, field: "none" }
    )
  }
  if (metric === "arr") {
    return (
      pick(arr, "arr_delayed") ??
      pick(any, "delayed") ??
      pick(dep, "dep_delayed") ?? { minutes: 0, field: "none" }
    )
  }
  return (
    pick(any, "delayed") ??
    pick(dep, "dep_delayed") ??
    pick(arr, "arr_delayed") ?? { minutes: 0, field: "none" }
  )
}

function extractFlightObject(parsed: unknown): AirlabsFlight {
  // AirLabs /flight docs show a raw flight object, but on errors they return {"error":{...}}
  // Some gateways/wrappers may put it under `response`.
  if (!isObj(parsed)) throw new Error("AirLabs response is not an object")

  // If error format, throw a clean error
  const maybeErr = parsed as AirlabsError
  if (maybeErr.error && isObj(maybeErr.error)) {
    const code = String(maybeErr.error.code ?? "unknown")
    const message = String(maybeErr.error.message ?? "Unknown error")
    throw new Error(`AirLabs API error (${code}): ${message}`)
  }

  // Wrapper support: { response: { ...flight... } }
  const resp = (parsed as any).response
  if (isObj(resp)) return resp as AirlabsFlight

  // Otherwise treat as flight
  return parsed as AirlabsFlight
}

export function normalizeAirlabsFlight(args: {
  flightId: string
  departTs: number
  matchWindowSeconds: number
  delayMetric: "dep" | "arr" | "any"
  resp: FlightAPIResponse
}): NormalizedFlightStatus {
  const parsed = JSON.parse(args.resp.rawJsonString) as unknown
  const obj = extractFlightObject(parsed)

  const apiFlightIata = toUpper(obj.flight_iata)
  const apiCsFlightIata = toUpper(obj.cs_flight_iata)
  const want = args.flightId.toUpperCase()

  // If flight_iata is missing but there's no error object, show keys for debugging
  if (!apiFlightIata && !apiCsFlightIata) {
    const keys = isObj(obj) ? Object.keys(obj).slice(0, 25).join(",") : ""
    throw new Error(`AirLabs /flight response missing flight identifiers (flight_iata/cs_flight_iata). keys=${keys}`)
  }

  // Verify the returned flight matches the requested one
  if (apiFlightIata !== want && apiCsFlightIata !== want) {
    throw new Error(
      `AirLabs /flight returned a different flight. want=${want} got=${apiFlightIata} cs=${apiCsFlightIata}`
    )
  }

  const depTimeTs = typeof obj.dep_time_ts === "number" ? obj.dep_time_ts : 0
  const arrTimeTs = typeof obj.arr_time_ts === "number" ? obj.arr_time_ts : 0

  const diffSeconds = depTimeTs ? Math.abs(depTimeTs - args.departTs) : Number.POSITIVE_INFINITY
  const withinWindow = diffSeconds <= args.matchWindowSeconds

  const depDelayed = numOrNull(obj.dep_delayed)
  const arrDelayed = numOrNull(obj.arr_delayed)
  const anyDelayed = numOrNull(obj.delayed)

  const picked = pickDelayMinutes(args.delayMetric, depDelayed, arrDelayed, anyDelayed)
  const flags = statusFlags(String(obj.status ?? ""))

  return {
    provider: "AirLabsFlight",
    flightId: want,

    apiFlightIata,
    apiCsFlightIata,

    depTimeTs,
    arrTimeTs,

    delayMetric: args.delayMetric,
    delayFieldUsed: picked.field,
    delayMinutes: picked.minutes,

    status: flags.status,
    cancelled: flags.cancelled,
    diverted: flags.diverted,

    withinWindow,
    departTsDiffSeconds: Number.isFinite(diffSeconds) ? diffSeconds : 0,
  }
}