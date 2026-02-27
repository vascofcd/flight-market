import { useMemo, useState } from "react";
import Field from "../components/Field";

const CreateMarket = () => {
  const [busy, setBusy] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [flightId, setFlightId] = useState("TP1234");
  const [thresholdMin, setThresholdMin] = useState("60");
  const [departLocal, setDepartLocal] = useState(() => {
    const d = new Date(Date.now() + 6 * 60 * 60 * 1000);
    return toLocalInputValue(d);
  });
  const [closeLocal, setCloseLocal] = useState(() => {
    const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return toLocalInputValue(d);
  });

  const departTs = useMemo(() => toUnixSeconds(departLocal), [departLocal]);
  const closeTs = useMemo(() => toUnixSeconds(closeLocal), [closeLocal]);

  function autoFill() {
    const now = new Date();
    const dep = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const clo = new Date(dep.getTime() - 3 * 60 * 60 * 1000);
    setDepartLocal(toLocalInputValue(dep));
    setCloseLocal(toLocalInputValue(clo));
    // setToast({ kind: "good", msg: "Auto-filled: depart +6h, close -3h." });
  }

  async function onCreate() {}

  return (
    <>
      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Create market</h2>

          <Field label="Flight ID">
            <input
              value={flightId}
              onChange={(e) => setFlightId(e.target.value)}
              placeholder="e.g. TP1234"
            />
          </Field>

          <div className="row2">
            <Field label="Departure time (local)">
              <input
                type="datetime-local"
                value={departLocal}
                onChange={(e) => setDepartLocal(e.target.value)}
              />
            </Field>
            <Field label="Close time (local)">
              <input
                type="datetime-local"
                value={closeLocal}
                onChange={(e) => setCloseLocal(e.target.value)}
              />
            </Field>
          </div>

          <div className="row2">
            <Field
              label="Threshold minutes"
              hint="Binary market: YES if delayMinutes >= thresholdMin."
            >
              <input
                type="number"
                min={1}
                value={thresholdMin}
                onChange={(e) => setThresholdMin(e.target.value)}
              />
            </Field>

            <div>
              <label>Rule reminder</label>
              <div
                className="muted"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px dashed rgba(255,255,255,.14)",
                }}
              >
                Close must be <b>before</b> departure and at least{" "}
                <b>2 hours</b> before depart.
              </div>
            </div>
          </div>

          <div className="actions2">
            <button onClick={onCreate} disabled={busy}>
              Create Market
            </button>
            <button className="secondary" onClick={autoFill} disabled={busy}>
              Auto-fill times
            </button>
          </div>

          {/* <TxToast kind={toast?.kind} message={toast?.msg || null} /> */}

          {createdId ? <div className="hr" /> : null}

          {createdId ? (
            <div className="card" style={{ padding: 12, borderRadius: 14 }}>
              <div>
                <b>Created:</b> Market #{createdId}
              </div>
              <div className="actions2" style={{ marginTop: 10 }}>
                <a href={`/market/${createdId}`}>
                  <button className="good">Open Market</button>
                </a>
                <a href={`/market/${createdId}/settlement`}>
                  <button className="secondary">Go to Settlement</button>
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2>Tips</h2>
          <div className="muted">
            <ul>
              <li>
                Make sure the contract address at the top is your deployed
                Sepolia <span className="mono">FlightMarket</span>.
              </li>
              <li>
                After requesting settlement, your CRE workflow should detect the{" "}
                <span className="mono">SettlementRequested</span> event.
              </li>
              <li>
                Once CRE writes the report onchain, this UI will show{" "}
                <span className="mono">resolved=true</span> and enable claims.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toUnixSeconds(local: string) {
  if (!local) return 0;
  const d = new Date(local);
  return Math.floor(d.getTime() / 1000);
}

export default CreateMarket;
