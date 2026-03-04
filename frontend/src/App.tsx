import { Outlet } from "react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NavBar } from "./components/NavBar";

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              ✈️
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Flight Markets</div>
              <div className="text-xs text-slate-500">
                Delay prediction + parametric cover
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NavBar />
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 text-xs text-slate-500">
        Built for demo: CRE workflow resolves outcomes from external flight data.
      </footer>
    </div>
  );
};

export default App;