# Flight Markets — CRE-settled Flight delay prediction markets

A binary prediction market and “parametric cover” demo:

- **YES** = “flight disruption” *(default: `cancelled OR diverted OR delayMinutes ≥ thresholdMin`)*
- **NO** = otherwise
- Anyone can request settlement after close.
- A **Chainlink CRE workflow** listens for the onchain `SettlementRequested` event, fetches flight status from **AirLabs**, deterministically computes `delayMinutes` + outcome, builds an **Evidence Pack** (JSON) + `evidenceHash`, then submits a **signed report** back onchain via the CRE **Forwarder → onReport** flow.

---

## Architecture

1) **User trades YES/NO** on `FlightMarket.sol` (parimutuel pools).  
2) After close, someone calls `requestSettlement(marketId)` → emits `SettlementRequested`.  
3) **CRE Workflow** (TypeScript):
   - **EVM Log Trigger** catches the event
   - **HTTP Client** calls AirLabs `/flight?flight_iata=...`
   - Deterministically computes:
     - `delayMinutes` from `dep_delayed` / `arr_delayed` / `delayed`
     - `cancelled/diverted` inferred from `status`
   - Builds Evidence Pack JSON → canonicalize → `keccak256` → `evidenceHash`
   - stores settlement data in Firestore
   - Creates a signed report and performs **onchain write** via Forwarder → `onReport(...)`.
4) Contract stores `resolved`, `delayMinutes`, and `evidenceHash`, enabling verification.

---

## Repo Layout

- `solidity/` — Foundry project (`FlightMarket.sol`)
- `workflows/flight-delay/` — Chainlink CRE workflow (TypeScript)
- `frontend/` — React + Vite + TS + Tailwind + Recharts UI