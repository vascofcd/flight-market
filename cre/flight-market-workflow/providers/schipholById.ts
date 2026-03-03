import {
  HTTPClient,
  ok,
  text,
  consensusIdenticalAggregation,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import type { FlightAPIResponse } from "../types.js";

export type SchipholByIdConfig = {
  baseUrl: string;
  resourceVersion: string;
};

export type SchipholByIdQuery = {
  headers: Record<string, string>;
  id: string;
  cfg: SchipholByIdConfig;
};

function baseUrl(cfg: SchipholByIdConfig): string {
  return cfg.baseUrl.replace(/\/+$/, "");
}

function buildByIdUrl(id: string, cfg: SchipholByIdConfig): string {
  return `${baseUrl(cfg)}/flights/${encodeURIComponent(id)}`;
}

const fetchById = (
  sendRequester: HTTPSendRequester,
  q: { url: string; headers: Record<string, string> },
): FlightAPIResponse => {
  const response = sendRequester
    .sendRequest({
      url: q.url,
      method: "GET",
      headers: q.headers,
    })
    .result();

  const statusCode = response.statusCode;
  const bodyText = text(response);

  if (!ok(response)) return { statusCode, rawJsonString: bodyText };
  return { statusCode, rawJsonString: bodyText };
};

export function fetchSchipholById(
  runtime: Runtime<unknown>,
  q: SchipholByIdQuery,
): FlightAPIResponse {
  const url = buildByIdUrl(q.id, q.cfg);
  runtime.log(`SchipholById GET ${url}`);

  const httpClient = new HTTPClient();
  return httpClient
    .sendRequest(
      runtime,
      fetchById,
      consensusIdenticalAggregation<FlightAPIResponse>(),
    )({
      url,
      headers: q.headers,
    })
    .result();
}
