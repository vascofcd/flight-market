import Markets from "./Markets";

const Home = () => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">
          Welcome to Flight Markets
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Create a market on whether a flight will be delayed beyond a
          threshold. Trade YES/NO, then resolve via an oracle evidence pack.
        </p>
      </section>

      <Markets />
    </div>
  );
};

export default Home;
