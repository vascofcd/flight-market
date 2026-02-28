type Env = {
  walletConnectProjectId: string;
  marketContractAddress: `0x${string}`;
  sepoliaRpcUrl?: string;
};

function requireValue(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function asAddress(name: string, value: string): `0x${string}` {
  if (!value.startsWith("0x") || value.length !== 42) {
    throw new Error(`Invalid address in env var ${name}: ${value}`);
  }
  return value as `0x${string}`;
}

export const env: Env = {
  walletConnectProjectId: requireValue(
    "VITE_PUBLIC_WALLETCONNECT_PROJECT_ID",
    import.meta.env.VITE_PUBLIC_WALLETCONNECT_PROJECT_ID,
  ),
  marketContractAddress: asAddress(
    "VITE_FLIGHT_MARKET_ADDRESS",
    requireValue(
      "VITE_FLIGHT_MARKET_ADDRESS",
      import.meta.env.VITE_FLIGHT_MARKET_ADDRESS,
    ),
  ),
  sepoliaRpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL,
};
