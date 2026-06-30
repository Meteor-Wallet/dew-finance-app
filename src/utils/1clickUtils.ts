import type { ChainName } from "../stores/wallet_store";

const chainNameTo1ClickBlockchain = (chainName: ChainName): string => {
  switch (chainName) {
    case "eth":
      return "eth";
    case "monad":
      return "monad";
    case "polygon":
      return "pol";
    case "plasma":
      return "plasma"
    case "bsc":
      return "bsc"
    case "arbitrum":
      return "arb";
    case "solana":
      return "sol";
    case "zec":
      return "zec"
    case "near":
      return "near";
  }
};

// key is the NEAR token contract address
// value maps 1Click blockchain id → contract address on that chain
const tokenPairMap: Record<
  string,
  Partial<
    Record<
      "eth" | "arb" | "sol" | "zec" | "monad" | "plasma" | "pol" | "bsc",
      string
    >
  >
> = {
  "usdt.tether-token.near": {
    eth: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    arb: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    sol: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    monad: "0xe7cd86e13ac4309349f30b3435a9d337750fc82d",
    plasma: "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb",
    pol: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    bsc: "0x55d398326f99059ff775485246999027b3197955"
  },
  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1": {
    eth: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    arb: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    sol: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    monad: "0x754704bc059f8c67012fed69bc8a327a5aafb603",
    pol: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    bsc: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
  },
  "zec.omft.near": {
    zec: "native",
  },
};

export const oneClickUtils = {
  chainNameTo1ClickBlockchain,
  tokenPairMap
};
