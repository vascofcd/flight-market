import { formatEth } from "../utils/format";

type LiquidityPoolsProps = {
  yesPool: bigint;
  noPool: bigint;
};

export const LiquidityPoolsDetails = ({ yesPool, noPool }: LiquidityPoolsProps) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Liquidity pools</h3>
        <div className="text-xs text-slate-500">
          Total{" "}
          <span className="font-mono text-slate-800">
            {formatEth(yesPool + noPool)}
          </span>{" "}
          ETH
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              YES pool
            </div>
            <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
              Delayed
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-900">
            {formatEth(yesPool)}{" "}
            <span className="text-sm font-semibold text-emerald-800">ETH</span>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              NO pool
            </div>
            <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 whitespace-nowrap">
              Not delayed
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {formatEth(noPool)}{" "}
            <span className="text-sm font-semibold text-slate-700">ETH</span>
          </div>
        </div>
      </div>
    </section>
  );
};