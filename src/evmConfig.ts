import { createConfig, http } from "wagmi";
import { mainnet, arbitrum } from "wagmi/chains";
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
  ],
  connectors: [injected(), coinbaseWallet({ appName: "Dew Finance" })],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
  },
});
