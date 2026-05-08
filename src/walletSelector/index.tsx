import { useCallback } from "react";
import { useWalletStore } from "../stores/wallet_store";
import { nearConnector } from "../nearConnector";
import type { TAsset } from "../queries/vault";

export const useWalletSelector = () => {

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

  const signIn = useCallback<(adapterType: "evm" | "sol" | "near") => Promise<void>>(
    async (adapterType) => {
      if (adapterType === "near") {
        await nearConnector.connect();
        return;
      }
      throw new Error("Not implemented");
    },
    []
  );

  const signOut = useCallback(async () => {
    const selectedChain = useWalletStore.getState().selectedChain;
    if (selectedChain === "near") {
      const result = await nearConnector.getConnectedWallet().catch(() => null);
      if (result) await nearConnector.disconnect(result.wallet);
      else useWalletStore.getState().disconnectSelectedChainWallet();
      return;
    }
    useWalletStore.getState().disconnectSelectedChainWallet();
  }, []);

  return { requestDeposit, signIn, signOut };
};
