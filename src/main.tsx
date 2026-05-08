import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { queryClient } from "./queryClient.ts";
import { isEqual } from "es-toolkit";
import { useWalletStore } from "./stores/wallet_store.ts";
import { dewFactoryUtils } from "./utils/dewFactoryUtils.ts";
import { nearUtils } from "./utils/nearUtils.ts";
import { toast } from "sonner";
import Big from "big.js";
import "./nearConnector.ts";

Big.DP = 26;

useWalletStore.subscribe(
  (s) =>
    s.connectedWallets.find((e) =>
      e.supportedChains.includes(s.selectedChain)
    ) ?? null,
  async (wallet) => {
    if (!wallet) return;

    const supportedChain = wallet.supportedChains[0];

    // NEAR wallet: account ID is already the NEAR address, skip factory
    if (supportedChain === "near") {
      useWalletStore.getState().setCurrentNearAccountId({ nearAccountId: wallet.address });
      return;
    }

    // DO NOT REMOVE THIS SETTIMEOUT
    // IT WILL SOMEHOW REMOVE THE SUBSCRIPTION
    setTimeout(() => {
      useWalletStore.getState().setCurrentNearAccountId({ nearAccountId: null });
    }, 0);

    let toastId: string | number | undefined = undefined;
    try {
      toastId = toast.loading("Account", {
        description: "Checking account state",
      });

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

        useWalletStore.getState().openOnboardModal();
      } else {
        useWalletStore
          .getState()
          .setCurrentNearAccountId({ nearAccountId: nearAddress });
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
  },
  { equalityFn: isEqual }
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
