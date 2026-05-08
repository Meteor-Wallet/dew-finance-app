import { useCallback } from "react";
import { useWalletStore } from "../stores/wallet_store";
import type { TAsset } from "../queries/vault";

export const useWalletSelector = () => {
  const signMessage = useCallback<(message: string) => Promise<string>>(
    async () => {
      throw new Error("Not implemented");
    },
    []
  );

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

  const signIn = useCallback<(adapterType: "evm" | "sol") => Promise<void>>(
    async () => {
      throw new Error("Not implemented");
    },
    []
  );

  const signOut = useCallback(async () => {
    useWalletStore.getState().disconnectSelectedChainWallet();
  }, []);

  const getBalance = useCallback<
    (args: { asset: TAsset; address: string }) => Promise<{ formatted: string }>
  >(
    async () => {
      throw new Error("Not implemented");
    },
    []
  );

  return { signMessage, requestDeposit, signIn, getBalance, signOut };
};
