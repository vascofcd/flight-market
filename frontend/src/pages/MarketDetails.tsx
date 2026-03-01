import { Link, useParams } from "react-router";
import { formatEth, formatUnixSeconds } from "../utils/format";
import { useMarket } from "../hooks/useMarket";
import { MarketActionsBox } from "../components/MarketActionsBox";
import { getMarketStatus } from "../features/marketStatus";

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

          <hr />

          <MarketActionsBox market={marketQuery.data} />
        </div>
      ) : null}
    </div>
  );
};

export default MarketDetails;
