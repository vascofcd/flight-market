import { Link, useParams } from "react-router";
import { useMarket } from "../hooks/useMarket";
import { getMarketStatus } from "../features/marketStatus";
import { UserPosition } from "../components/UserPosition";
import { LiquidityPoolsDetails } from "../components/LiquidityPoolsDetails";
import { MarketActionsBox } from "../components/MarketActionsBox";
import { formatUnixSeconds } from "../utils/format";
import { statusPillClass } from "../utils/statusPillClass";
import { parseMarketId } from "../utils/parseMarketId";

const MarketDetails = () => {
  const { marketId: marketIdParam } = useParams();
  const marketId = parseMarketId(marketIdParam);

  const marketQuery = useMarket(marketId);
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  if (marketId === null) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
          <div className="font-semibold">Invalid market id</div>
          <div className="mt-1 opacity-90">
            The URL param is not a valid integer market id.
          </div>
        </div>
        <Link
          to="/markets"
          className="inline-flex items-center text-sm font-semibold text-slate-900 hover:underline underline-offset-4"
        >
          ← Back to markets
        </Link>
      </div>
    );
  }

  const status = marketQuery.data
    ? String(getMarketStatus(marketQuery.data, nowSec))
    : "…";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/markets"
          className="inline-flex items-center text-sm font-semibold text-slate-900 hover:underline underline-offset-4"
        >
          ← Back
        </Link>

        <div className="hidden sm:block text-xs text-slate-500">
          Market ID{" "}
          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-800">
            {marketId.toString()}
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Market #{marketId.toString()}
            </h2>

            {marketQuery.data ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={statusPillClass(status)}>{status}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-200">
                  Flight{" "}
                  <span className="font-mono">{marketQuery.data.flightId}</span>
                </span>
                <span className="text-xs text-slate-500">
                  Threshold:{" "}
                  <span className="font-mono text-slate-800">
                    {marketQuery.data.thresholdMin.toString()}m
                  </span>
                </span>
              </div>
            ) : null}
          </div>

          {/* lightweight loading indicator */}
          {marketQuery.isLoading ? (
            <div className="h-9 w-28 animate-pulse rounded-xl bg-slate-100" />
          ) : null}
        </div>

        {marketQuery.error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Error: {String(marketQuery.error)}
          </div>
        ) : null}
      </header>

      {marketQuery.data ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left panel*/}
          <div className="space-y-6 lg:col-span-8">
            {/* Details */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold">Market details</h3>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Departure
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {formatUnixSeconds(marketQuery.data.departTs)}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Trading close
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {formatUnixSeconds(marketQuery.data.closeTs)}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Flight ID
                  </dt>
                  <dd className="mt-1">
                    <span className="rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-900 ring-1 ring-inset ring-slate-200">
                      {marketQuery.data.flightId}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Delay threshold
                  </dt>
                  <dd className="mt-1">
                    <span className="rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-900 ring-1 ring-inset ring-slate-200">
                      {marketQuery.data.thresholdMin.toString()} minutes
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="min-w-0">
                <LiquidityPoolsDetails
                  yesPool={marketQuery.data.yesPool}
                  noPool={marketQuery.data.noPool}
                />
              </div>

              <div className="min-w-0">
                <UserPosition marketId={marketId} />
              </div>
            </div>
          </div>

          {/* Right panel */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <MarketActionsBox market={marketQuery.data} />
            </div>
          </aside>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {marketQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            <p className="text-sm text-slate-600">No data.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketDetails;
