import {
  HTTPClient,
  ok,
  json,
  text,
  consensusIdenticalAggregation,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk"
import type { FlightAPIResponse } from "../types.js"

/**
 * Schiphol provider
 * - Always uses /flights/{id} for the final “truth” call.
 * - If market flightId is already a numeric Schiphol id => direct call.
 * - Else => lookup by flightName in a +/- time window, pick closest scheduleDateTime, then call /flights/{id}.
 * - CRE runtime: explicitly set method="GET" (some versions require it).
 */

export type SchipholConfig = {
  schipholBaseUrl: string
  schipholResourceVersion: string
  schipholWindowSeconds: number
}

export type SchipholResolvedQuery = {
  headers: Record<string, string>
  flightId: string // may be flightName or Schiphol numeric id
  departTs: number // unix seconds
  cfg: SchipholConfig
}

type SchipholFlight = {
  id?: string
  flightName?: string
  mainFlight?: string
  flightDirection?: "A" | "D"
  scheduleDateTime?: string
  actualLandingTime?: string
  estimatedLandingTime?: string
  actualOffBlockTime?: string
  publicEstimatedOffBlockTime?: string
  codeshares?: { codeshares?: string[] }
}

type SchipholFlightList = { flights?: SchipholFlight[] }

function isoLocalNoOffsetUTC(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mi = String(d.getUTCMinutes()).padStart(2, "0")
  const ss = String(d.getUTCSeconds()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`
}

function encodeQuery(params: Record<string, string>): string {
  const keys = Object.keys(params).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return keys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&")
}

function baseUrl(cfg: SchipholConfig): string {
  return cfg.schipholBaseUrl.replace(/\/+$/, "")
}

function buildLookupUrl(flightName: string, departTs: number, cfg: SchipholConfig): string {
  const from = departTs - cfg.schipholWindowSeconds
  const to = departTs + cfg.schipholWindowSeconds

  const params: Record<string, string> = {
    flightName,
    fromDateTime: isoLocalNoOffsetUTC(from),
    toDateTime: isoLocalNoOffsetUTC(to),
    searchDateTimeField: "scheduleDateTime",
    sort: "+scheduleDateTime",
  }

  return `${baseUrl(cfg)}/flights?${encodeQuery(params)}`
}

function buildByIdUrl(id: string, cfg: SchipholConfig): string {
  return `${baseUrl(cfg)}/flights/${encodeURIComponent(id)}`
}

function looksLikeSchipholId(s: string): boolean {
  return /^[0-9]{12,}$/.test(s)
}

function matchesFlightId(f: SchipholFlight, flightId: string): boolean {
  const want = flightId.toUpperCase()
  const name = (f.flightName ?? "").toUpperCase()
  const main = (f.mainFlight ?? "").toUpperCase()
  const codeshares = (f.codeshares?.codeshares ?? []).map((x) => x.toUpperCase())
  return name === want || main === want || codeshares.includes(want)
}

function pickBestFlight(list: SchipholFlightList, flightId: string, departTs: number): SchipholFlight | null {
  const flights = list.flights ?? []
  const candidates = flights.filter((f) => matchesFlightId(f, flightId))
  if (candidates.length === 0) return null

  let best = candidates[0]
  let bestDiff = Number.POSITIVE_INFINITY

  for (const f of candidates) {
    const sched = f.scheduleDateTime ? Date.parse(f.scheduleDateTime) : NaN
    if (!Number.isFinite(sched)) continue
    const diff = Math.abs(sched - departTs * 1000)
    if (diff < bestDiff) {
      bestDiff = diff
      best = f
    }
  }
  return best
}

function slimFlight(f: SchipholFlight, resolvedId: string): unknown {
  return {
    provider: "Schiphol",
    resolvedId,
    id: f.id ?? "",
    flightName: f.flightName ?? "",
    mainFlight: f.mainFlight ?? "",
    flightDirection: f.flightDirection ?? "",
    scheduleDateTime: f.scheduleDateTime ?? "",
    actualLandingTime: f.actualLandingTime ?? "",
    estimatedLandingTime: f.estimatedLandingTime ?? "",
    actualOffBlockTime: f.actualOffBlockTime ?? "",
    publicEstimatedOffBlockTime: f.publicEstimatedOffBlockTime ?? "",
    codeshares: f.codeshares?.codeshares ?? [],
  }
}

const doRequest = (
  sendRequester: HTTPSendRequester,
  url: string,
  headers: Record<string, string>
): { statusCode: number; bodyText: string; ok: boolean } => {
  // IMPORTANT: method must be explicitly set for some CRE runtime versions
  const response = sendRequester
    .sendRequest({
      url,
      method: "GET",
      headers,
    })
    .result()

  const statusCode = response.statusCode
  const bodyText = text(response)
  return { statusCode, bodyText, ok: ok(response) }
}

const fetchLookup = (sendRequester: HTTPSendRequester, q: { url: string; headers: Record<string, string> }): FlightAPIResponse => {
  const r = doRequest(sendRequester, q.url, q.headers)
  return { statusCode: r.statusCode, rawJsonString: r.bodyText }
}

const fetchById = (sendRequester: HTTPSendRequester, q: { url: string; headers: Record<string, string> }): FlightAPIResponse => {
  const r = doRequest(sendRequester, q.url, q.headers)
  return { statusCode: r.statusCode, rawJsonString: r.bodyText }
}

export function fetchSchipholFlight(runtime: Runtime<unknown>, q: SchipholResolvedQuery): FlightAPIResponse {
  const httpClient = new HTTPClient()

  // 1) If already a Schiphol id: direct /flights/{id}
  if (looksLikeSchipholId(q.flightId)) {
    const url = buildByIdUrl(q.flightId, q.cfg)
    runtime.log(`Schiphol: using BY-ID endpoint directly: ${url}`)

    const raw = httpClient
      .sendRequest(runtime, fetchById, consensusIdenticalAggregation<FlightAPIResponse>())({ url, headers: q.headers })
      .result()

    try {
      const obj = JSON.parse(raw.rawJsonString) as SchipholFlight
      return { statusCode: raw.statusCode, rawJsonString: JSON.stringify({ flight: slimFlight(obj, q.flightId) }) }
    } catch {
      return raw
    }
  }

  // 2) Lookup to resolve id, then call /flights/{id}
  const lookupUrl = buildLookupUrl(q.flightId, q.departTs, q.cfg)
  runtime.log(`Schiphol: lookup to resolve id: ${lookupUrl}`)

  const lookupRaw = httpClient
    .sendRequest(runtime, fetchLookup, consensusIdenticalAggregation<FlightAPIResponse>())({ url: lookupUrl, headers: q.headers })
    .result()

  if (lookupRaw.statusCode < 200 || lookupRaw.statusCode >= 300) return lookupRaw

  let resolvedId = ""
  try {
    const parsed = json({ statusCode: lookupRaw.statusCode, body: new TextEncoder().encode(lookupRaw.rawJsonString) } as any) as SchipholFlightList
    const best = pickBestFlight(parsed, q.flightId, q.departTs)
    resolvedId = best?.id ?? ""
  } catch {
    // Fall back to JSON.parse if json() wrapper doesn’t like our shape
    try {
      const parsed2 = JSON.parse(lookupRaw.rawJsonString) as SchipholFlightList
      const best2 = pickBestFlight(parsed2, q.flightId, q.departTs)
      resolvedId = best2?.id ?? ""
    } catch {
      return { statusCode: lookupRaw.statusCode, rawJsonString: JSON.stringify({ error: "LOOKUP_PARSE_FAILED" }) }
    }
  }

  if (!resolvedId) {
    return { statusCode: 200, rawJsonString: JSON.stringify({ error: "FLIGHT_NOT_FOUND", flightId: q.flightId }) }
  }

  const byIdUrl = buildByIdUrl(resolvedId, q.cfg)
  runtime.log(`Schiphol: resolved id=${resolvedId}, calling BY-ID endpoint: ${byIdUrl}`)

  const byIdRaw = httpClient
    .sendRequest(runtime, fetchById, consensusIdenticalAggregation<FlightAPIResponse>())({ url: byIdUrl, headers: q.headers })
    .result()

  if (byIdRaw.statusCode < 200 || byIdRaw.statusCode >= 300) return byIdRaw

  try {
    const flight = JSON.parse(byIdRaw.rawJsonString) as SchipholFlight
    return { statusCode: byIdRaw.statusCode, rawJsonString: JSON.stringify({ flight: slimFlight(flight, resolvedId) }) }
  } catch {
    return byIdRaw
  }
}