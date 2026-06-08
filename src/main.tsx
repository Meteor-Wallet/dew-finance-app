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

      const walletStoreSnapshot = useWalletStore.getState();

      if (walletStoreSnapshot.nearAccountId) {
        break;
      }

      if (supportedChain === "near") {
        useWalletStore
          .getState()
          .setCurrentNearAccountId({ nearAccountId: wallet.address });
        continue;
      }

      try {
        const { accountExists, nearAddress } =
          await multicaUtils.checkAccountExists({
            address: wallet.address,
            chain: supportedChain,
          });

        if (accountExists) {
          useWalletStore
            .getState()
            .setCurrentNearAccountId({ nearAccountId: nearAddress });
        }
      } catch (err) {
        console.log(err);
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
