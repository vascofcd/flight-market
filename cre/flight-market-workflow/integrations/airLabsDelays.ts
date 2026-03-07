import {
  HTTPClient,
  ok,
  text,
  consensusIdenticalAggregation,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import type { FlightAPIResponse } from "../types";

export type AirlabsFlightConfig = {
  baseUrl: string;
  apiKey: string;
  flightIata: string;
};

function baseUrl(cfg: AirlabsFlightConfig): string {
  return cfg.baseUrl.replace(/\/+$/, "");
}

function encodeQuery(params: Record<string, string>): string {
  const keys = Object.keys(params).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return keys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
}

function buildUrl(cfg: AirlabsFlightConfig): string {
  const qs = encodeQuery({
    flight_iata: cfg.flightIata,
    api_key: cfg.apiKey,
  });
  return `${baseUrl(cfg)}/flight?${qs}`;
}

const fetchFlight = (
  sendRequester: HTTPSendRequester,
  q: { url: string },
): FlightAPIResponse => {
  const response = sendRequester
    .sendRequest({
      url: q.url,
      method: "GET",
      headers: { accept: "application/json" },
    })
    .result();

  const statusCode = response.statusCode;
  const bodyText = text(response);

  if (!ok(response)) return { statusCode, rawJsonString: bodyText };
  return { statusCode, rawJsonString: bodyText };
};

export function fetchAirLabsFlight(
  runtime: Runtime<unknown>,
  cfg: AirlabsFlightConfig,
): FlightAPIResponse {
  const url = buildUrl(cfg);
  runtime.log(`AirLabs GET ${url.replace(cfg.apiKey, "***")}`);

  const httpClient = new HTTPClient();
  return httpClient
    .sendRequest(runtime, fetchFlight, consensusIdenticalAggregation<FlightAPIResponse>())(
      { url },
    )
    .result();
}
