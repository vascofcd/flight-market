import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useUserPosition } from "../hooks/useUserPosition";
import { useRequestSettlement } from "../hooks/useRequestSettlement";
import { useClaim } from "../hooks/useClaim";
import { useClaimedPayout } from "../hooks/useClaimedPayout";
import { formatEth, formatUnixSeconds } from "../utils/format";
import { BuyPositionBox } from "./BuyPositionBox";
import type { Market } from "../features/types";

function Banner({
  tone,
  title,
  children,
}: {
  tone: "error" | "warn" | "info" | "success";
  title: string;
  children?: React.ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-xl border p-4 text-sm ${styles}`}>
      <div className="font-semibold">{title}</div>
      {children ? <div className="mt-1 opacity-90">{children}</div> : null}
    </div>
  );
}

const monoBox =
  "break-all rounded-lg bg-white/70 p-2 font-mono text-xs ring-1 ring-inset";

export function MarketActionsBox(props: { market: Market }) {
  const { address } = useAccount();
  const pos = useUserPosition(props.market.marketId);

  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  const isOpen = !props.market.resolved && nowSec < props.market.closeTs;
  const isClosed = !props.market.resolved && nowSec >= props.market.closeTs;

  const settlementRequested =
    props.market.settlementRequestedTs !== 0n && !props.market.resolved;

  const canRequestSettlement =
    isClosed && props.market.settlementRequestedTs === 0n;

  const hasAnyPosition = pos.yesAmount > 0n || pos.noAmount > 0n;

  const canClaim = props.market.resolved && !pos.hasClaimed && hasAnyPosition;

  const request = useRequestSettlement();
  const claim = useClaim();

  const claimedPayoutQuery = useClaimedPayout({
    marketId: props.market.marketId,
    user: (address ?? null) as `0x${string}` | null,
    enabled: props.market.resolved && pos.hasClaimed,
  });

  const outcomeLabel = useMemo(() => {
    if (!props.market.resolved) return "Not resolved yet";
    return props.market.delayed ? "YES (Delayed)" : "NO (Not delayed)";
  }, [props.market.delayed, props.market.resolved]);

  return (
    <div className="space-y-4">
      {/* Trade */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Trade</h3>
            <p className="mt-1 text-xs text-slate-500">
              Buy YES/NO while trading is open.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
            {isOpen ? "Open" : props.market.resolved ? "Resolved" : "Closed"}
          </div>
        </div>

        <div className="mt-4">
          {isOpen ? (
            <BuyPositionBox marketId={props.market.marketId} />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Trading is not available right now.
              <div className="mt-2 text-xs text-slate-500">
                Close time:{" "}
                <span className="font-medium text-slate-700">
                  {formatUnixSeconds(props.market.closeTs)}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Settlement / Resolution */}
      {!props.market.resolved ? (
        <>
          {isClosed && !settlementRequested ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold">Settlement</h3>
              <p className="mt-2 text-sm text-slate-600">
                Trading closed at{" "}
                <span className="font-medium text-slate-800">
                  {formatUnixSeconds(props.market.closeTs)}
                </span>
                . Anyone can request resolution.
              </p>

              <button
                type="button"
                disabled={
                  !canRequestSettlement ||
                  request.isPending ||
                  request.isConfirming
                }
                onClick={() => request.requestSettlement(props.market.marketId)}
                className={[
                  "mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
                  canRequestSettlement &&
                  !request.isPending &&
                  !request.isConfirming
                    ? "bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
                    : "cursor-not-allowed bg-slate-200 text-slate-500",
                ].join(" ")}
              >
                {request.isPending || request.isConfirming
                  ? "Requesting…"
                  : "Request settlement"}
              </button>

              <button
                type="button"
                onClick={request.reset}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              >
                Reset tx state
              </button>

              {request.error ? (
                <div className="mt-4">
                  <Banner tone="error" title="Wallet error">
                    {request.error.message}
                  </Banner>
                </div>
              ) : null}

              {request.confirmError ? (
                <div className="mt-4">
                  <Banner tone="error" title="Confirm error">
                    {String(request.confirmError)}
                  </Banner>
                </div>
              ) : null}

              {request.hash ? (
                <div className="mt-4">
                  <Banner tone="info" title="Transaction sent">
                    <div className={`${monoBox} ring-slate-200`}>
                      {request.hash}
                    </div>
                  </Banner>
                </div>
              ) : null}

              {request.isConfirmed ? (
                <div className="mt-4">
                  <Banner tone="success" title="Settlement requested">
                    CRE workflow should resolve this market soon.
                  </Banner>
                </div>
              ) : null}
            </section>
          ) : null}

          {settlementRequested ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold">Settlement</h3>
              <p className="mt-2 text-sm text-slate-600">
                Requested at{" "}
                <span className="font-medium text-slate-800">
                  {formatUnixSeconds(props.market.settlementRequestedTs)}
                </span>
                .
              </p>
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Waiting for CRE workflow to resolve the market…
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Resolved</h3>

          <div className="mt-3 space-y-3">
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Outcome
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {outcomeLabel}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Delay minutes
                </div>
                <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
                  {props.market.delayMinutes.toString()}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Evidence hash
                </div>
                <div className="mt-1 font-mono text-[11px] font-semibold text-slate-900">
                  {String(props.market.evidenceHash).slice(0, 10)}…
                </div>
              </div>
            </div>

            <details className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                Show full evidence hash
              </summary>
              <div className={`mt-3 ${monoBox} ring-slate-200`}>
                {String(props.market.evidenceHash)}
              </div>
            </details>

            {!address ? (
              <Banner tone="info" title="Connect wallet">
                Connect your wallet to claim winnings (if any).
              </Banner>
            ) : null}

            {address && canClaim ? (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={claim.isPending || claim.isConfirming}
                  onClick={() => claim.claim(props.market.marketId)}
                  className={[
                    "inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
                    claim.isPending || claim.isConfirming
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/40",
                  ].join(" ")}
                >
                  {claim.isPending || claim.isConfirming
                    ? "Claiming…"
                    : "Claim"}
                </button>

                <button
                  type="button"
                  onClick={claim.reset}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                >
                  Reset tx state
                </button>

                {claim.error ? (
                  <Banner tone="error" title="Wallet error">
                    {claim.error.message}
                  </Banner>
                ) : null}

                {claim.confirmError ? (
                  <Banner tone="error" title="Confirm error">
                    {String(claim.confirmError)}
                  </Banner>
                ) : null}

                {claim.hash ? (
                  <Banner tone="info" title="Transaction sent">
                    <div className={`${monoBox} ring-slate-200`}>
                      {claim.hash}
                    </div>
                  </Banner>
                ) : null}

                {claim.isConfirmed ? (
                  <Banner tone="success" title="Claim confirmed">
                    Your claim was confirmed on-chain.
                  </Banner>
                ) : null}

                {claim.payout !== null ? (
                  <Banner tone="success" title="Payout">
                    <span className="font-mono font-semibold">
                      {formatEth(claim.payout)}
                    </span>{" "}
                    ETH
                  </Banner>
                ) : null}
              </div>
            ) : null}

            {address && pos.hasClaimed ? (
              <div className="space-y-2">
                <Banner tone="success" title="Already claimed">
                  You already claimed for this market.
                </Banner>

                {claimedPayoutQuery.isLoading ? (
                  <p className="text-xs text-slate-500">Loading payout…</p>
                ) : null}

                {claimedPayoutQuery.data !== null &&
                claimedPayoutQuery.data !== undefined ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                    Last payout found in logs (best-effort):{" "}
                    <span className="font-mono font-semibold">
                      {formatEth(claimedPayoutQuery.data)}
                    </span>{" "}
                    ETH
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Payout not found in recent logs window (still claimed).
                  </div>
                )}
              </div>
            ) : null}

            {address && !pos.hasClaimed && !hasAnyPosition ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                You had no position in this market.
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* fallback */}
      {!props.market.resolved &&
      !isOpen &&
      !canRequestSettlement &&
      !settlementRequested ? (
        <Banner tone="info" title="No actions available">
          Market not tradable right now.
        </Banner>
      ) : null}
    </div>
  );
}
