import { createBrowserRouter } from "react-router";
import App from "./App";
import Home from "./pages/Home";
import CreateMarket from "./pages/CreateMarket";
import Markets from "./pages/Markets";
import MarketDetails from "./pages/MarketDetails";
import { DataDetails } from "./pages/DataDetails";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      { index: true, Component: Home },
      { path: "create-market", Component: CreateMarket },
      { path: "markets", Component: Markets },
      { path: "markets/:marketId", Component: MarketDetails },
      { path: "data-details", Component: DataDetails },
    ],
  },
]);
