import { useMemo, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import { useBuyPosition } from "../hooks/useBuyPosition";

function isValidAmount(value: string): boolean {
  if (!value.trim()) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

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

  function valueWei(): bigint {
    return parseEther(amountEth);
  }

  return (
    <div>
      <h3>Buy position</h3>

      {!address ? <p>Connect your wallet to trade.</p> : null}
      {wrongNetwork ? (
        <p>
          Wrong network. Switch to <b>{sepolia.name}</b>.
        </p>
      ) : null}

      <label>
        Amount (ETH)
        <input
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
          placeholder="0.01"
        />
      </label>

      <div>
        <button
          type="button"
          disabled={!address || wrongNetwork || !amountOk || isBusy}
          onClick={() => buy.buyYes(props.marketId, valueWei())}
        >
          Buy YES
        </button>

        <button
          type="button"
          disabled={!address || wrongNetwork || !amountOk || isBusy}
          onClick={() => buy.buyNo(props.marketId, valueWei())}
        >
          Buy NO
        </button>
      </div>

      <div>
        <button type="button" onClick={buy.reset}>
          Reset tx state
        </button>
      </div>

      {buy.error ? <p>Wallet error: {buy.error.message}</p> : null}
      {buy.confirmError ? (
        <p>Confirm error: {String(buy.confirmError)}</p>
      ) : null}

      {buy.hash ? (
        <p>
          Tx: <code>{buy.hash}</code>
        </p>
      ) : null}

      {buy.isConfirmed ? <p>Trade confirmed!</p> : null}
    </div>
  );
}
