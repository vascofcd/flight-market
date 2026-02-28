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
    flightMarket: "0x704b455caC0054114Fb8C4DDC63bd598525A8eF7",
    no_check: "0x704b455caC0054114Fb8C4DDC63bd598525A8eF7",
  },
};
