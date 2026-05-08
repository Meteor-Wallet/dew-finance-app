import { useCallback } from "react";
import { walletStore } from "../stores/wallet_store";
import type { TAsset } from "../queries/vault";

export const useWalletSelector = () => {

  const signMessage = useCallback(
    async (message: string) => {
      const selectedChain = walletStore.store.get().context.selectedChain;
    },
    []
  );

  const requestDeposit = useCallback(
    async (args: {
      asset: TAsset;
      amount: bigint;
      receiver_address: `0x${string}` | string;
    }) => {
      const selectedChain = walletStore.store.get().context.selectedChain;
    },
    []
  );

  const signIn = useCallback(
    async (adapterType: "evm" | "sol") => {

    },
    []
  );

  const signOut = useCallback(async () => {
    const selectedChain = walletStore.store.get().context.selectedChain;

    walletStore.store.trigger.disconnectSelectedChainWallet();
  }, []);

  const getBalance = useCallback(
    async (args: { asset: TAsset; address: string }) => {
      const selectedChain = walletStore.store.get().context.selectedChain;
    },
    []
  );

  return {
    signMessage,
    requestDeposit,
    signIn,
    getBalance,
    signOut,
  };
};
