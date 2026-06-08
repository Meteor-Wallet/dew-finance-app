import type { ChainName } from "../stores/wallet_store";

const chainNameTo1ClickBlockchain = (chainName: ChainName): string => {
  switch (chainName) {
    case "eth":
      return "eth";
    case "arbitrum":
      return "arb";
    case "solana":
      return "sol";
    case "near":
      return "near";
  }
};

// key is the NEAR token contract address
// value maps 1Click blockchain id → contract address on that chain
const tokenPairMap: Record<string, Partial<Record<"eth" | "arb" | "sol", string>>> = {
  "usdt.tether-token.near": {
    eth: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    arb: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    sol: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
  },
  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1": {
    eth: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    arb: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    sol: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  }
}

export const oneClickUtils = {
  chainNameTo1ClickBlockchain,
  tokenPairMap
};
