import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, arbitrum } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [mainnet, arbitrum],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Dew Finance" }),
  ],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
  },
});

export function EvmProvider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
