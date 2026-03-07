import Markets from "./Markets";

const Home = () => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">
          Welcome to Flight Markets — smarter cover for flight delays and
          cancellations, powered by Chainlink
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Buy smart travel cover in minutes with Flight Markets. When disruption
          happens, payouts are triggered by verified flight data and settled
          onchain — fast, simple, and transparent.
        </p>
      </section>

      <Markets />
    </div>
  );
};

export default Home;
