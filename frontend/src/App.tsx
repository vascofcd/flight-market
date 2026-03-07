import { Outlet } from "react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NavBar } from "./components/NavBar";

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-3 items-center px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              ✈️
            </div>
            <div className="leading-tight">
              <div className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Flight Markets
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <NavBar />
          </div>

          <div className="flex items-center justify-end gap-3">
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default App;
