import { StrictMode } from "react";
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

const connectedWalletSelector = walletStore.store.select(
  (ctx) =>
    ctx.connectedWallets.find((e) =>
      e.supportedChains.includes(ctx.selectedChain)
    ),
  _.isEqual
);

connectedWalletSelector.subscribe(async (wallet) => {
  if (wallet) {
    let toastId: string | number | undefined = undefined;
    try {
      toastId = toast.loading("Account", {
        description: "Checking account state",
      });
      const supportedChain = wallet.supportedChains[0];
      if (supportedChain) {
        console.log(wallet);
      }
      const address = wallet.address;
      const { nearAddress } =
        dewFactoryUtils.getAccountDetailsFromAddressAndChain({
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
          id: toastId
        });
        walletStore.store.trigger.openOnboardModal();
      } else {
        toast.success("Account", {
          description: "Account is ready",
          id: toastId
        });
      }
    } catch (err) {
      toast.error("Account", {
        description: "Failed to check account status, please try to refresh",
        id: toastId
      });
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
