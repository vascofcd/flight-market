import { z } from "zod";

const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address")
  .transform((v) => v as `0x${string}`);

const EnvSchema = z.object({
  walletConnectProjectId: z
    .string()
    .min(1, "Missing required env var: VITE_PUBLIC_WALLETCONNECT_PROJECT_ID"),
  marketContractAddress: AddressSchema,
  sepoliaRpcUrl: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url("VITE_SEPOLIA_RPC_URL must be a valid URL").optional(),
  ),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse({
  walletConnectProjectId: import.meta.env.VITE_PUBLIC_WALLETCONNECT_PROJECT_ID,
  marketContractAddress: import.meta.env.VITE_FLIGHT_MARKET_ADDRESS,
  sepoliaRpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL,
});
