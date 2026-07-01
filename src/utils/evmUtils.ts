import type { ChainName, EvmChainName } from "../stores/wallet_store";
import { mainnet, arbitrum, monad, plasma, polygon, bsc, base, berachain } from "wagmi/chains";

const chainToWagmiChainId = (chain: ChainName) => {
  if (chain === "eth") {
    return mainnet.id;
  }
  if (chain === "arbitrum") {
    return arbitrum.id;
  }
  if (chain === "monad") {
    return monad.id;
  }
  if (chain === "plasma") {
    return plasma.id;
  }
  if (chain === "polygon") {
    return polygon.id;
  }
  if (chain === "bsc") {
    return bsc.id;
  }
  if (chain === "base"){
    return base.id
  }
  if (chain === 'bera'){
    return berachain.id
  }
  throw new Error(`Unsupported chain for deposit: ${chain}`);
};

export const evmUtils = {
  chainToWagmiChainId,
};
