import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useUserPosition } from "../hooks/useUserPosition";
import { useRequestSettlement } from "../hooks/useRequestSettlement";
import { useClaim } from "../hooks/useClaim";
import { useClaimedPayout } from "../hooks/useClaimedPayout";
import { formatEth, formatUnixSeconds } from "../utils/format";
import { BuyPositionBox } from "./BuyPositionBox";
import type { Market } from "../features/types";

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
    <div>
      <h3>Actions</h3>

      <h4>Your position</h4>
      {!address ? <p>Connect wallet to see your position.</p> : null}

      {address ? (
        <ul>
          <li>
            YES staked: <code>{formatEth(pos.yesAmount)}</code> ETH
          </li>
          <li>
            NO staked: <code>{formatEth(pos.noAmount)}</code> ETH
          </li>
          <li>
            Claimed: <code>{String(pos.hasClaimed)}</code>
          </li>
        </ul>
      ) : null}

      <hr />

      {isOpen ? <BuyPositionBox marketId={props.market.marketId} /> : null}

      {isClosed && !settlementRequested ? (
        <div>
          <h4>Settlement</h4>
          <p>Trading closed at: {formatUnixSeconds(props.market.closeTs)}</p>
          <button
            type="button"
            disabled={request.isPending || request.isConfirming}
            onClick={() => request.requestSettlement(props.market.marketId)}
          >
            Request settlement
          </button>

          {request.error ? <p>Wallet error: {request.error.message}</p> : null}
          {request.confirmError ? (
            <p>Confirm error: {String(request.confirmError)}</p>
          ) : null}
          {request.hash ? (
            <p>
              Tx: <code>{request.hash}</code>
            </p>
          ) : null}
          {request.isConfirmed ? <p>Settlement requested!</p> : null}
        </div>
      ) : null}

      {settlementRequested ? (
        <div>
          <h4>Settlement</h4>
          <p>
            Settlement requested at:{" "}
            {formatUnixSeconds(props.market.settlementRequestedTs)}
          </p>
          <p>Waiting for CRE workflow to resolve the market…</p>
        </div>
      ) : null}

      {props.market.resolved ? (
        <div>
          <h4>Resolved</h4>
          <ul>
            <li>
              Outcome: <b>{outcomeLabel}</b>
            </li>
            <li>
              Delay minutes: <code>{props.market.delayMinutes.toString()}</code>
            </li>
            <li>
              Evidence hash: <code>{props.market.evidenceHash}</code>
            </li>
          </ul>

          {!address ? <p>Connect wallet to claim.</p> : null}

          {address && canClaim ? (
            <div>
              <button
                type="button"
                disabled={claim.isPending || claim.isConfirming}
                onClick={() => claim.claim(props.market.marketId)}
              >
                Claim
              </button>

              {claim.error ? <p>Wallet error: {claim.error.message}</p> : null}
              {claim.confirmError ? (
                <p>Confirm error: {String(claim.confirmError)}</p>
              ) : null}
              {claim.hash ? (
                <p>
                  Tx: <code>{claim.hash}</code>
                </p>
              ) : null}
              {claim.isConfirmed ? <p>Claim confirmed!</p> : null}
              {claim.payout !== null ? (
                <p>
                  Payout: <code>{formatEth(claim.payout)}</code> ETH
                </p>
              ) : null}
            </div>
          ) : null}

          {address && pos.hasClaimed ? (
            <div>
              <p>You already claimed for this market!</p>
              {claimedPayoutQuery.isLoading ? <p>Loading payout…</p> : null}
              {claimedPayoutQuery.data !== null &&
              claimedPayoutQuery.data !== undefined ? (
                <p>
                  Last payout found in logs (best-effort):{" "}
                  <code>{formatEth(claimedPayoutQuery.data)}</code> ETH
                </p>
              ) : (
                <p>Payout not found in recent logs window (still claimed).</p>
              )}
            </div>
          ) : null}

          {address && !pos.hasClaimed && !hasAnyPosition ? (
            <p>You had no position in this market.</p>
          ) : null}
        </div>
      ) : null}

      {!props.market.resolved &&
      !isOpen &&
      !canRequestSettlement &&
      !settlementRequested ? (
        <div>
          <p>Market not tradable right now.</p>
        </div>
      ) : null}
    </div>
  );
}
