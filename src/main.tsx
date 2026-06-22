import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { queryClient } from "./queryClient.ts";
import { isEqual } from "es-toolkit";
import { useWalletStore } from "./stores/wallet_store.ts";
import { dewFactoryUtils } from "./utils/dewFactoryUtils.ts";
import Big from "big.js";
import "./nearConnector.ts";

Big.DP = 26;

useWalletStore.subscribe(
  (s) => s.connectedWallets,
  async (wallets, prevWallets) => {
    const newWallets = wallets.filter(
      (w) => !prevWallets.some((p) => p.address === w.address),
    );

    const isDisconnecting = wallets.length < prevWallets.length;

    if(isDisconnecting && wallets.length > 0){
      const walletStoreSnapshot = useWalletStore.getState();

      // If the user is disconnecting a wallet, we need to check if the current nearAccountId is still valid.
      if(walletStoreSnapshot.nearAccountId){
        const currentNearAccountId = walletStoreSnapshot.nearAccountId;

        let accountIsValid = false;

        for(const wallet of wallets){
          const { accountExists, nearAddress } =
            await dewFactoryUtils.checkAccountExists({
              address: wallet.address,
              chain: wallet.supportedChains[0],
            });

          if(nearAddress === currentNearAccountId){
            accountIsValid = true;
          }
        }

        if(!accountIsValid){
          useWalletStore
            .getState()
            .setCurrentNearAccountId({ nearAccountId: null });
        }
      }
    }

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
          await dewFactoryUtils.checkAccountExists({
            address: wallet.address,
            chain: supportedChain,
          });

        if (accountExists) {
          useWalletStore
            .getState()
            .setCurrentNearAccountId({ nearAccountId: nearAddress });
          useWalletStore
            .getState()
            .setPendingAbstractAccountCreation(null);
        } else {
          if(!useWalletStore.getState().nearAccountId){
            useWalletStore
              .getState()
              .setPendingAbstractAccountCreation({ address: wallet.address, chain: supportedChain });
          }
        }
      } catch (err) {
        console.log(err);
      }
    }

    if(wallets.length === 0){
      useWalletStore
        .getState()
        .setCurrentNearAccountId({ nearAccountId: null });
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
