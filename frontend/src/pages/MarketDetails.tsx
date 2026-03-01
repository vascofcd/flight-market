import { Link, useParams } from "react-router";
import { useMarket } from "../hooks/useMarket";
import { getMarketStatus } from "../features/marketStatus";
import { formatEth, formatUnixSeconds } from "../utils/format";

function parseMarketId(value: string | undefined): bigint | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  return BigInt(value);
}

const MarketDetails = () => {
  const { marketId: marketIdParam } = useParams();
  const marketId = parseMarketId(marketIdParam);

  const marketQuery = useMarket(marketId);
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  if (marketId === null) {
    return (
      <div>
        <p>Invalid market id.</p>
        <Link to="/markets">Back to markets</Link>
      </div>
    );
  }

  return (
    <div>
      <p>
        <Link to="/markets">← Back</Link>
      </p>

      <h2>Market #{marketId.toString()}</h2>

      {marketQuery.isLoading ? <p>Loading market…</p> : null}
      {marketQuery.error ? <p>Error: {String(marketQuery.error)}</p> : null}

      {marketQuery.data ? (
        <div>
          <p>
            Status: <b>{getMarketStatus(marketQuery.data, nowSec)}</b>
          </p>

          <h3>Params</h3>
          <ul>
            <li>
              Flight ID: <code>{marketQuery.data.flightId}</code>
            </li>
            <li>Departure: {formatUnixSeconds(marketQuery.data.departTs)}</li>
            <li>
              Threshold minutes:{" "}
              <code>{marketQuery.data.thresholdMin.toString()}</code>
            </li>
            <li>
              Trading close: {formatUnixSeconds(marketQuery.data.closeTs)}
            </li>
          </ul>

          <h3>Pools</h3>
          <ul>
            <li>YES pool: {formatEth(marketQuery.data.yesPool)} ETH</li>
            <li>NO pool: {formatEth(marketQuery.data.noPool)} ETH</li>
          </ul>

          <h3>Settlement</h3>
          <ul>
            <li>
              Settlement requested at:{" "}
              {marketQuery.data.settlementRequestedTs === 0n
                ? "Not requested"
                : formatUnixSeconds(marketQuery.data.settlementRequestedTs)}
            </li>
          </ul>

          <h3>Resolution</h3>
          <ul>
            <li>
              Resolved: <code>{String(marketQuery.data.resolved)}</code>
            </li>
            <li>
              Outcome (delayed): <code>{String(marketQuery.data.delayed)}</code>
            </li>
            <li>
              Delay minutes:{" "}
              <code>{marketQuery.data.delayMinutes.toString()}</code>
            </li>
            <li>
              Evidence hash: <code>{marketQuery.data.evidenceHash}</code>
            </li>
          </ul>

          <hr />
          <p>(Next step: Buy YES/NO + Request settlement + Evidence view.)</p>
        </div>
      ) : null}
    </div>
  );
};

export default MarketDetails;
