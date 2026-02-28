import { CreateMarketForm } from "../components/CreateMarketForm";

const CreateMarketPage = () => {
  return (
    <>
      <h2>Create Market</h2>
      <p>
        Creates a binary market: YES = flight delayed ≥ threshold minutes, NO
        otherwise.
      </p>
      <CreateMarketForm />
    </>
  );
};

export default CreateMarketPage;
