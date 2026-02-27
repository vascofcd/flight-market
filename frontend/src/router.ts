import { createBrowserRouter } from "react-router";
import HomePage from "./pages/HomePage";
import FlightsPage from "./pages/FlightsPage";
import App from "./App";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      { index: true, Component: HomePage },
      { path: "flights", Component: FlightsPage },
    ],
  },
]);
