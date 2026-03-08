import { Link } from "react-router";
import { getMarketStatus } from "../features/marketStatus";
import { useMarketCreatedWatcher } from "../hooks/useMarketCreatedWatcher";
import { useMarkets } from "../hooks/useMarkets";
import { formatEth, formatUnixSeconds } from "../utils/format";
import { statusPillClass } from "../utils/statusPillClass";

const Markets = () => {
  useMarketCreatedWatcher();

  const { count, marketsQuery, truncated, maxLoaded } = useMarkets();
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Markets</h2>
          <p className="mt-1 text-sm text-slate-600">
            Total markets onchain:{" "}
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800">
              {(count - BigInt(1)).toString()}
            </span>
          </p>

          {truncated ? (
            <p className="mt-2 text-xs text-slate-500">
              Showing only the latest{" "}
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
                {maxLoaded}
              </span>{" "}
              markets.
            </p>
          ) : null}
        </div>

        <Link
          to="/create-market"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
        >
          + Create market
        </Link>
      </div>

      <div className="mt-5">
        {marketsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-6 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {marketsQuery.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Error: {String(marketsQuery.error)}
          </div>
        ) : null}

        {marketsQuery.data ? (
          marketsQuery.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {marketsQuery.data.map((m) => {
                const status = getMarketStatus(m, nowSec);

                return (
                  <Link
                    key={m.marketId.toString()}
                    to={`/markets/${m.marketId.toString()}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold text-slate-900">
                          Market #{m.marketId.toString()}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800">
                          Flight {m.flightId}
                        </span>
                      </div>

                      <span className={statusPillClass(String(status))}>
                        {String(status)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">Departure</span>
                        <span className="text-right font-medium text-slate-800">
                          {formatUnixSeconds(m.departTs)}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-500">Close</span>
                        <span className="text-right font-medium text-slate-800">
                          {formatUnixSeconds(m.closeTs)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                          YES Pool
                        </p>
                        <p className="mt-2 text-sm font-semibold text-emerald-900">
                          {formatEth(m.yesPool)} ETH
                        </p>
                      </div>

                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-rose-700">
                          NO Pool
                        </p>
                        <p className="mt-2 text-sm font-semibold text-rose-900">
                          {formatEth(m.noPool)} ETH
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-sm text-slate-500">
                        Click to view market
                      </span>
                      <span className="text-sm font-semibold text-slate-900 transition group-hover:translate-x-0.5">
                        Open →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <h3 className="text-base font-semibold text-slate-900">
                No markets yet
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Create the first flight delay market to get started.
              </p>
              <Link
                to="/create-market"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Create market
              </Link>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
};

export default Markets;
