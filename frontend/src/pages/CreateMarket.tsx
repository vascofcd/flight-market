import { CreateMarketForm } from "../components/CreateMarketForm";

const CreateMarketPage = () => {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">Create Market</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Creates a binary market: <span className="font-semibold">YES</span> =
          flight delayed ≥ threshold minutes,{" "}
          <span className="font-semibold">NO</span> otherwise.
        </p>
      </header>

      <CreateMarketForm />
    </div>
  );
};

export default CreateMarketPage;
