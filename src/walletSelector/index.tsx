import { useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { useWalletStore } from "../stores/wallet_store";
import { nearConnector } from "../nearConnector";
import type { TAsset } from "../queries/vault";

export const useWalletSelector = () => {
  const { select, connect, disconnect: solanaDisconnect, publicKey, connected } = useWallet();

  // Sync Solana wallet state into the shared store
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      useWalletStore.getState().connectWallet({
        address,
        supportedChains: ["solana"],
        selectedChain: "solana",
      });
      useWalletStore.getState().closeConnectWalletModal();
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (!connected && !publicKey) {
      useWalletStore.getState().disconnectChainWallet("solana");
    }
  }, [connected, publicKey]);

  const requestDeposit = useCallback<
    (args: {
      asset: TAsset;
      amount: bigint;
      receiver_address: `0x${string}` | string;
    }) => Promise<void>
  >(
    async () => {
      throw new Error("Not implemented");
    },
    []
  );

  const signIn = useCallback<
    (adapterType: "evm" | "sol" | "near", options?: { walletName?: string }) => Promise<void>
  >(
    async (adapterType, options) => {
      if (adapterType === "near") {
        await nearConnector.connect();
        return;
      }
      if (adapterType === "sol") {
        const walletName = options?.walletName;
        if (!walletName) throw new Error("walletName required for sol");
        select(walletName as WalletName);
        // connect() is triggered by the wallet adapter after select()
        await connect().catch(() => {
          // User may have rejected — adapter handles the error state
        });
        return;
      }
      throw new Error("Not implemented");
    },
    [select, connect]
  );

  const signOut = useCallback(async () => {
    const selectedChain = useWalletStore.getState().selectedChain;
    if (selectedChain === "near") {
      const result = await nearConnector.getConnectedWallet().catch(() => null);
      if (result) await nearConnector.disconnect(result.wallet);
      else useWalletStore.getState().disconnectSelectedChainWallet();
      return;
    }
    if (selectedChain === "solana") {
      await solanaDisconnect();
      // The sync effect above will remove the wallet from the store
      return;
    }
    useWalletStore.getState().disconnectSelectedChainWallet();
  }, [solanaDisconnect]);

  return { requestDeposit, signIn, signOut };
};
