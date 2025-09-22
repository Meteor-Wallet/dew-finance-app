import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { wagmiAdapter } from "./walletSelector/useWagmiSelector.tsx";
import { queryClient } from "./queryClient.ts";
import _ from "lodash";
import { walletStore } from "./stores/wallet_store.ts";
import { dewFactoryUtils } from "./utils/dewFactoryUtils.ts";
import { nearUtils } from "./utils/nearUtils.ts";
import { toast } from "sonner";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import Big from "big.js";

Big.DP = 26

const endpoint = `https://backend-v2-dev.meteorwallet.app/rpc/solana`;

const SolanaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const connectedWalletSelector = walletStore.store.select(
  (ctx) =>
    ctx.connectedWallets.find((e) =>
      e.supportedChains.includes(ctx.selectedChain)
    ) || null,
  _.isEqual
);

connectedWalletSelector.subscribe(async (wallet) => {
  // DO NOT REMOVE THIS SETTIMEOUT
  // IT WILL SOMEHOW REMOVE THE SUBSCRIPTION
  setTimeout(() => {
    walletStore.store.trigger.setCurrentNearAccountId({
      nearAccountId: null,
    });
  }, 0);
  if (wallet) {
    let toastId: string | number | undefined = undefined;
    try {
      toastId = toast.loading("Account", {
        description: "Checking account state",
      });
      const supportedChain = wallet.supportedChains[0];

      const address = wallet.address;
      const { nearAddress } =
        await dewFactoryUtils.getAccountDetailsFromAddressAndChain({
          address,
          chain: supportedChain,
        });

      const accountExists = await nearUtils.provider
        .viewAccount(nearAddress)
        .then(() => true)
        .catch(() => false);

      if (!accountExists) {
        toast.info("Account", {
          description: "Account is pending creation",
          id: toastId,
        });

        walletStore.store.trigger.openOnboardModal();
      } else {
        walletStore.store.trigger.setCurrentNearAccountId({
          nearAccountId: nearAddress,
        });
        toast.success("Account", {
          description: "Account is ready",
          id: toastId,
        });
      }
    } catch (err) {
      console.log(err);
      toast.error("Account", {
        description: "Failed to check account status, please try to refresh",
        id: toastId,
      });
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SolanaProvider>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </SolanaProvider>
  </StrictMode>
);
