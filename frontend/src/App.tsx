import { Outlet } from "react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NavBar } from "./components/NavBar";

const App = () => {
  return (
    <div>
      <ConnectButton />
      <NavBar />
      <Outlet />
    </div>
  );
};

export default App;
