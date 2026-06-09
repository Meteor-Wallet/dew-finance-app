import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./evmConfig";

export function EvmProvider({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
