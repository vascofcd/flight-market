import { getJson } from "serpapi";

export async function fetchFlight() {
    const json = await getJson({
        engine: "google_flights",
        departure_id: "CDG",
        arrival_id: "AUS",
        currency: "USD",
        type: "2",
        outbound_date: "2026-03-03",
        api_key: "2f647fd33540d37d7f1f3661cbfa789e17cdd9d5651db4fbc40dc207d4700b79",
    });

    return json["best_flights"];
}