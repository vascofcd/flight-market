// import {
//     consensusIdenticalAggregation,
//     cre,
//     ok,
//     Runtime,
//     type HTTPSendRequester,
// } from "@chainlink/cre-sdk";
// import { Config, FlightAPIResponse } from "./types";


// export const fetchFlight = (runtime: Runtime<Config>): FlightAPIResponse => {
//     const apiKey = runtime.getSecret({ id: "SERAPI_API_KEY" }).result();

//     const httpClient = new cre.capabilities.HTTPClient();

//     const result: FlightAPIResponse = httpClient
//         .sendRequest(
//             runtime,
//             fetch(apiKey.value),
//             consensusIdenticalAggregation<FlightAPIResponse>()
//         )()
//         .result();

//     return result;
// }

// const fetch = (apiKey: string) => (sendRequester: HTTPSendRequester): FlightAPIResponse => {
//     const req = {
//         url: `https://serpapi.com/search.json?engine=google_flights&departure_id=PEK&arrival_id=AUS&outbound_date=2026-02-22&return_date=2026-02-28&currency=USD&hl=en`,
//         method: "GET",
//         headers: {
//             "Content-Type": "application/json",
//             "x-goog-api-key": apiKey,
//         },
//     }

//     const resp = sendRequester.sendRequest(req).result();
//     const bodyText = new TextDecoder().decode(resp.body);

//     if (!ok(resp))
//         throw new Error(`HTTP request failed with status: ${resp.statusCode}. Error :${bodyText}`);

//     const externalResp = JSON.parse(bodyText) as FlightAPIResponse;

//     const text = externalResp.rawJsonString;

//     if (!text)
//         throw new Error("Malformed text in FlightAPIResponse");

//     return {
//         statusCode: resp.statusCode,
//         rawJsonString: bodyText,
//     };
// }