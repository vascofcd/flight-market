import { useMemo, useState } from "react";
import { sepolia } from "wagmi/chains";
import { datetimeLocalToUnixSeconds, nowUnixSeconds } from "../utils/datetime";
import { useCreateMarket } from "../hooks/useCreateMarket";

type FormState = {
  flightId: string;
  departLocal: string;
  thresholdMin: string;
  closeLocal: string;
};

function validate(state: FormState): string | null {
  if (!state.flightId.trim()) return "Flight ID is required.";
  if (!state.departLocal) return "Departure date/time is required.";
  if (!state.closeLocal) return "Close date/time is required.";
  const threshold = Number(state.thresholdMin);
  if (!Number.isFinite(threshold) || threshold <= 0)
    return "Threshold minutes must be > 0.";

  const departTs = datetimeLocalToUnixSeconds(state.departLocal);
  const closeTs = datetimeLocalToUnixSeconds(state.closeLocal);
  const now = nowUnixSeconds();

  if (departTs <= now) return "Departure must be in the future.";
  if (closeTs <= now) return "Close time must be in the future.";
  if (closeTs >= departTs) return "Close time must be before departure.";

  return null;
}

export function CreateMarketForm() {
  const [form, setForm] = useState<FormState>({
    flightId: "",
    departLocal: "",
    thresholdMin: "60",
    closeLocal: "",
  });

  const formError = useMemo(() => validate(form), [form]);

  const {
    wrongNetwork,
    createMarket,
    reset,
    hash,
    createdMarketId,
    isPending,
    error,
    isConfirming,
    isConfirmed,
    confirmError,
  } = useCreateMarket();

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (wrongNetwork) return;
    if (formError) return;

    const departTs = BigInt(datetimeLocalToUnixSeconds(form.departLocal));
    const closeTs = BigInt(datetimeLocalToUnixSeconds(form.closeLocal));
    const thresholdMin = BigInt(Math.floor(Number(form.thresholdMin)));

    createMarket({
      flightId: form.flightId.trim(),
      departTs,
      thresholdMin,
      closeTs,
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <fieldset disabled={isPending || isConfirming}>
        <div>
          <label>
            Flight ID
            <input
              value={form.flightId}
              onChange={(e) => onChange("flightId", e.target.value)}
              placeholder="e.g., KL1234"
            />
          </label>
        </div>

        <div>
          <label>
            Departure (local time)
            <input
              type="datetime-local"
              value={form.departLocal}
              onChange={(e) => onChange("departLocal", e.target.value)}
            />
          </label>
        </div>

        <div>
          <label>
            Delay threshold (minutes)
            <input
              type="number"
              min={1}
              step={1}
              value={form.thresholdMin}
              onChange={(e) => onChange("thresholdMin", e.target.value)}
            />
          </label>
        </div>

        <div>
          <label>
            Trading close (local time)
            <input
              type="datetime-local"
              value={form.closeLocal}
              onChange={(e) => onChange("closeLocal", e.target.value)}
            />
          </label>
        </div>

        <div>
          <button type="submit" disabled={Boolean(formError) || wrongNetwork}>
            Create Market
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
            }}
          >
            Reset tx state
          </button>
        </div>

        {wrongNetwork ? (
          <p>
            Wrong network. Please switch to <b>{sepolia.name}</b>.
          </p>
        ) : null}

        {formError ? <p>{formError}</p> : null}

        {error ? <p>Wallet error: {error.message}</p> : null}
        {confirmError ? <p>Confirm error: {String(confirmError)}</p> : null}

        {hash ? (
          <p>
            Tx sent: <code>{hash}</code>
          </p>
        ) : null}

        {isConfirmed ? <p>Confirmed ✅</p> : null}

        {createdMarketId !== null ? (
          <p>
            Market created! marketId: <code>{createdMarketId.toString()}</code>
          </p>
        ) : null}
      </fieldset>
    </form>
  );
}
