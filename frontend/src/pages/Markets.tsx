import { Link } from "react-router";
import { getMarketStatus } from "../features/marketStatus";
import { useMarketCreatedWatcher } from "../hooks/useMarketCreatedWatcher";
import { useMarkets } from "../hooks/useMarkets";
import { formatEth, formatUnixSeconds } from "../utils/format";

const Markets = () => {
  useMarketCreatedWatcher();

  const { count, marketsQuery, truncated, maxLoaded } = useMarkets();
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  return (
    <div>
      <h2>Markets</h2>

      <p>
        Total markets onchain: <code>{count.toString()}</code>
      </p>

      {truncated ? (
        <p>
          Showing only the latest <code>{maxLoaded}</code> markets.
        </p>
      ) : null}

      {marketsQuery.isLoading ? <p>Loading markets…</p> : null}
      {marketsQuery.error ? <p>Error: {String(marketsQuery.error)}</p> : null}

      {marketsQuery.data ? (
        <table>
          <thead>
            <tr>
              <th>Market</th>
              <th>Flight</th>
              <th>Departure</th>
              <th>Close</th>
              <th>Status</th>
              <th>YES Pool</th>
              <th>NO Pool</th>
            </tr>
          </thead>
          <tbody>
            {marketsQuery.data.map((m) => {
              const status = getMarketStatus(m, nowSec);
              return (
                <tr key={m.marketId.toString()}>
                  <td>
                    <Link to={`/markets/${m.marketId.toString()}`}>
                      #{m.marketId.toString()}
                    </Link>
                  </td>
                  <td>{m.flightId}</td>
                  <td>{formatUnixSeconds(m.departTs)}</td>
                  <td>{formatUnixSeconds(m.closeTs)}</td>
                  <td>{status}</td>
                  <td>{formatEth(m.yesPool)}</td>
                  <td>{formatEth(m.noPool)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}

      <p>
        <Link to="/create-market">Create a new market</Link>
      </p>
    </div>
  );
};

export default Markets;
