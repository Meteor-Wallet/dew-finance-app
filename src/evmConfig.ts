import { createConfig, http } from "wagmi";
import { mainnet, arbitrum, plasma, polygon, bsc, monad } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [
    {
      ...mainnet,
      rpcUrls: {
        default: { http: ["https://eth-mainnet.g.alchemy.com/public"] },
      },
    },
    arbitrum,
    plasma,
    polygon,
    bsc,
    monad
  ],
  connectors: [injected(), coinbaseWallet({ appName: "Dew Finance" })],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [plasma.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [monad.id]: http(),
  },
});
