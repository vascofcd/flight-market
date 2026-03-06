import { useMemo, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import { useBuyPosition } from "../hooks/useBuyPosition";
import { isValidAmount } from "../utils/validate";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm " +
  "text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 " +
  "focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20";

export function BuyPositionBox(props: {
  marketId: bigint;
  disabled?: boolean;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const wrongNetwork = chainId !== sepolia.id;

  const [amountEth, setAmountEth] = useState<string>("0.01");
  const amountOk = useMemo(() => isValidAmount(amountEth), [amountEth]);

  const buy = useBuyPosition();

  const isBusy = buy.isPending || buy.isConfirming || Boolean(props.disabled);
  const canTrade = Boolean(address) && !wrongNetwork && amountOk && !isBusy;

  function valueWei(): bigint {
    return parseEther(amountEth);
  }

  return (
    <div className="space-y-3">
      {/* top notices */}
      {!address ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Connect your wallet to trade.
        </div>
      ) : null}

      {wrongNetwork ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Wrong network. Switch to <b>{sepolia.name}</b>.
        </div>
      ) : null}

      {/* Amount + presets */}
      <div>
        <label className="text-sm font-medium text-slate-700">
          Amount (ETH)
          <input
            className={inputClass}
            value={amountEth}
            onChange={(e) => setAmountEth(e.target.value)}
            placeholder="0.01"
            inputMode="decimal"
          />
        </label>

        <div className="mt-2 flex flex-wrap gap-2">
          {["0.01", "0.05", "0.1", "0.25"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmountEth(v)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              {v}
            </button>
          ))}
        </div>

        {!amountOk ? (
          <p className="mt-2 text-xs text-rose-600">
            Enter a valid amount &gt; 0.
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            This is MVP “stake to pool” (not shares). You’ll claim from the
            winning pool after resolution.
          </p>
        )}
      </div>

      {/* Polymarket-ish YES / NO buttons */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!canTrade}
          onClick={() => buy.buyYes(props.marketId, valueWei())}
          className={[
            "group relative overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition",
            canTrade
              ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/60"
              : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-emerald-900">
              Buy YES
            </div>
            <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
              Delayed
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-800/80">
            Stake into the YES pool with{" "}
            <span className="font-mono font-semibold">{amountEth}</span> ETH
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-emerald-300/60" />
        </button>

        <button
          type="button"
          disabled={!canTrade}
          onClick={() => buy.buyNo(props.marketId, valueWei())}
          className={[
            "group relative overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition",
            canTrade
              ? "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
              : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Buy NO</div>
            <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-inset ring-slate-200">
              Not delayed
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-700/80">
            Stake into the NO pool with{" "}
            <span className="font-mono font-semibold">{amountEth}</span> ETH
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-slate-300/60" />
        </button>
      </div>

      {/* tx actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {isBusy ? "Waiting for wallet / confirmations…" : "Ready"}
        </div>
        <button
          type="button"
          onClick={buy.reset}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      {/* tx messages */}
      {buy.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Wallet error: {buy.error.message}
        </div>
      ) : null}

      {buy.confirmError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Confirm error: {String(buy.confirmError)}
        </div>
      ) : null}

      {buy.hash ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          <div className="font-semibold">Tx sent</div>
          <div className="mt-2 break-all rounded-lg bg-white/70 p-2 font-mono text-xs ring-1 ring-inset ring-slate-200">
            {buy.hash}
          </div>
        </div>
      ) : null}

      {buy.isConfirmed ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Trade confirmed!
        </div>
      ) : null}
    </div>
  );
}
