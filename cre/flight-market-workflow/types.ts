import { z } from "zod";

/*********************************
 * Configuration Schemas
 *********************************/

/**
 * Schema for individual EVM chain configuration.
 * Validates chain selector name, market contract address, and gas limit.
 */
const evmConfigSchema = z.object({
    chainSelectorName: z.string().min(1),
    flightMarketAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/u, "flightMarketAddress must be a 0x-prefixed 20-byte hex"),
    gasLimit: z
        .string()
        .regex(/^\d+$/, "gasLimit must be a numeric string")
        .refine(val => Number(val) > 0, { message: "gasLimit must be greater than 0" }),
});

/**
 * Schema for the main workflow configuration file (config.json).
 * Validates Gemini model name and array of EVM configurations.
 */
export const configSchema = z.object({
    evms: z.array(evmConfigSchema).min(1, "At least one EVM config is required"),
});

/** Type inferred from the validated config schema. */
export type Config = z.infer<typeof configSchema>;

/**
 * Response from the Flight API HTTP request.
 */
export type FlightAPIResponse = {
    statusCode: number;
    rawJsonString: string;
};