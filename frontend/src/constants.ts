interface ContractsConfig {
  [chainId: number]: {
    flightMarket: string;
    no_check: string | null;
  };
}

export const chainsToFlightMarket: ContractsConfig = {
  31337: {
    flightMarket: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    no_check: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  },
  11155111: {
    flightMarket: "0x7269b0b497FA850E0937399493379A6E945FCf97",
    no_check: "0x7269b0b497FA850E0937399493379A6E945FCf97",
  },
};
