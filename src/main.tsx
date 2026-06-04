import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { queryClient } from "./queryClient.ts";
import { isEqual } from "es-toolkit";
import { useWalletStore } from "./stores/wallet_store.ts";
import { dewFactoryUtils } from "./utils/dewFactoryUtils.ts";
import { multicaUtils } from "./utils/multicaUtils.ts";
import { nearUtils } from "./utils/nearUtils.ts";
import { toast } from "sonner";
import Big from "big.js";
import "./nearConnector.ts";

Big.DP = 26;

useWalletStore.subscribe(
  (s) => s.connectedWallets,
  async (wallets, prevWallets) => {
    const newWallets = wallets.filter(
      (w) => !prevWallets.some((p) => p.address === w.address),
    );

    for (const wallet of newWallets) {
      const supportedChain = wallet.supportedChains[0];

      if (supportedChain === "near") {
        useWalletStore
          .getState()
          .setCurrentNearAccountId({ nearAccountId: wallet.address });
        continue;
      }

      let toastId: string | number | undefined = undefined;
      try {
        toastId = toast.loading("Account", {
          description: "Checking account state",
        });

        const { accountExists, nearAddress } =
          await multicaUtils.checkAccountExists({
            address: wallet.address,
            chain: supportedChain,
          });

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
          description:
            "Failed to check account status, please try to refresh",
          id: toastId,
        });
      }
    }
  },
  { equalityFn: isEqual },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
