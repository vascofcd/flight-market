"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, anvil, sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Flight Market",
  projectId: import.meta.env.VITE_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [mainnet, sepolia, anvil],
  ssr: false,
});
