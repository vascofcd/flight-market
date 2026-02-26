// import { z } from "zod";

// const evmConfigSchema = z.object({
//   chainSelectorName: z.string().min(1),
//   flightMarketAddress: z
//     .string()
//     .regex(
//       /^0x[a-fA-F0-9]{40}$/u,
//       "flightMarketAddress must be a 0x-prefixed 20-byte hex",
//     ),
//   receiverAddress: z
//     .string()
//     .regex(
//       /^0x[a-fA-F0-9]{40}$/u,
//       "receiverAddress must be a 0x-prefixed 20-byte hex",
//     ),
//   gasLimit: z
//     .string()
//     .regex(/^\d+$/, "gasLimit must be a numeric string")
//     .refine((val) => Number(val) > 0, {
//       message: "gasLimit must be greater than 0",
//     }),
// });

// export const configSchema = z.object({
//   evms: z.array(evmConfigSchema).min(1, "At least one EVM config is required"),
// });

// export type Config = z.infer<typeof configSchema>;

// ///@dev Response from the Flight API HTTP request.
// export type FlightAPIResponse = {
//   statusCode: number;
//   rawJsonString: string;
// };
