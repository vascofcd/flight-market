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
              {count.toString()}
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
          <div className="space-y-3">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
            <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : null}

        {marketsQuery.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Error: {String(marketsQuery.error)}
          </div>
        ) : null}

        {marketsQuery.data ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Market
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Flight
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Departure
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Close
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                      YES Pool
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                      NO Pool
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {marketsQuery.data.map((m) => {
                    const status = getMarketStatus(m, nowSec);

                    return (
                      <tr
                        key={m.marketId.toString()}
                        className="hover:bg-slate-50/60"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <Link
                            to={`/markets/${m.marketId.toString()}`}
                            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
                          >
                            #{m.marketId.toString()}
                          </Link>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800">
                            {m.flightId}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          {formatUnixSeconds(m.departTs)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          {formatUnixSeconds(m.closeTs)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span className={statusPillClass(String(status))}>
                            {String(status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-800">
                          {formatEth(m.yesPool)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-800">
                          {formatEth(m.noPool)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>Tip: click a market to trade YES/NO.</span>
              <Link
                to="/create-market"
                className="font-semibold text-slate-900 underline-offset-4 hover:underline"
              >
                Create a new market →
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default Markets;
