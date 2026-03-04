import { type Runtime } from "@chainlink/cre-sdk";
import type { Config } from "./types";

export const getAirLabsApiKey = (runtime: Runtime<Config>): string => {
  const apiKey = runtime.getSecret({ id: "AIRLABS_API_KEY" }).result().value;

  if (!apiKey)
    throw new Error(
      "Missing secret AIRLABS_API_KEY (env var CRE_AIRLABS_API_KEY)",
    );

  return apiKey;
};
