import { useAccount } from "wagmi";
import { useUserPosition } from "../hooks/useUserPosition";
import { formatEth } from "../utils/format";

export const UserPosition = (props: { marketId: bigint }) => {
  const { address } = useAccount();
  const userPosition = useUserPosition(props.marketId);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold">Your position</h3>

      {!address ? (
        <p className="mt-2 text-sm text-slate-600">
          Connect wallet to see your position.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                YES staked
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-emerald-900">
                {formatEth(userPosition.yesAmount)} ETH
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                NO staked
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {formatEth(userPosition.noAmount)} ETH
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs ring-1 ring-inset ring-slate-200">
            <span className="text-slate-600">Claimed</span>
            <span className="font-mono text-slate-900">
              {String(userPosition.hasClaimed)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
