import React, { useMemo, useState } from "react";
import { sepolia } from "wagmi/chains";
import { datetimeLocalToUnixSeconds } from "../utils/datetime";
import { useCreateMarket } from "../hooks/useCreateMarket";
import { Banner } from "./ui/Banner";
import { validate } from "../utils/validate";
import type { FormState } from "../utils/types";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm " +
  "text-slate-900 shadow-sm outline-none transition " +
  "placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20";

const labelClass = "text-sm font-medium text-slate-700";

const helperClass = "mt-1 text-xs text-slate-500";

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

  const busy = isPending || isConfirming;
  const canSubmit = !busy && !wrongNetwork && !formError;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">Market parameters</h3>
            <p className="mt-1 text-sm text-slate-600">
              These fields are written on-chain. Make sure close time is before
              departure (and your contract cutoff rules, if any).
            </p>
          </div>

          <div className="hidden sm:block">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              Local time zone inputs
            </div>
          </div>
        </div>

        <fieldset disabled={busy} className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Flight ID
                <input
                  className={inputClass}
                  value={form.flightId}
                  onChange={(e) => onChange("flightId", e.target.value)}
                  placeholder="e.g., KL1234"
                  autoComplete="off"
                />
              </label>
              <p className={helperClass}>
                Use the same format your resolver API expects (IATA flight
                number).
              </p>
            </div>

            <div>
              <label className={labelClass}>
                Delay threshold (minutes)
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  step={1}
                  value={form.thresholdMin}
                  onChange={(e) => onChange("thresholdMin", e.target.value)}
                />
              </label>
              <p className={helperClass}>YES wins if delay ≥ this value.</p>
            </div>

            <div>
              <label className={labelClass}>
                Departure (local time)
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={form.departLocal}
                  onChange={(e) => onChange("departLocal", e.target.value)}
                />
              </label>
              <p className={helperClass}>Must be in the future.</p>
            </div>

            <div>
              <label className={labelClass}>
                Trading close (local time)
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={form.closeLocal}
                  onChange={(e) => onChange("closeLocal", e.target.value)}
                />
              </label>
              <p className={helperClass}>Users can trade until this time.</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
                  canSubmit
                    ? "bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
                    : "cursor-not-allowed bg-slate-200 text-slate-500",
                ].join(" ")}
              >
                {busy ? "Creating…" : "Create Market"}
              </button>

              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              >
                Reset tx state
              </button>
            </div>

            <div className="text-xs text-slate-500">
              {busy ? "Waiting for wallet / confirmations…" : "Ready."}
            </div>
          </div>
        </fieldset>
      </section>

      {/* Status / validation */}
      {wrongNetwork ? (
        <Banner tone="warn" title="Wrong network">
          Please switch to <span className="font-semibold">{sepolia.name}</span>
          .
        </Banner>
      ) : null}

      {formError ? (
        <Banner tone="error" title="Fix form errors">
          {formError}
        </Banner>
      ) : null}

      {error ? (
        <Banner tone="error" title="Wallet error">
          {error.message}
        </Banner>
      ) : null}

      {confirmError ? (
        <Banner tone="error" title="Confirmation error">
          {String(confirmError)}
        </Banner>
      ) : null}

      {hash ? (
        <Banner tone="info" title="Transaction sent">
          <div className="mt-2 break-all rounded-lg bg-white/60 p-2 font-mono text-xs ring-1 ring-inset ring-slate-200">
            {hash}
          </div>
        </Banner>
      ) : null}

      {isConfirmed ? (
        <Banner tone="success" title="Confirmed ✅">
          Your market creation transaction is confirmed.
        </Banner>
      ) : null}

      {createdMarketId !== null ? (
        <Banner tone="success" title="Market created">
          marketId:{" "}
          <span className="rounded-md bg-white/60 px-2 py-1 font-mono text-xs ring-1 ring-inset ring-emerald-200">
            {createdMarketId.toString()}
          </span>
        </Banner>
      ) : null}
    </form>
  );
}
