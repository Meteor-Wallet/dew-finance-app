import { useWagmiSelector } from "./useWagmiSelector";
import { useCallback } from "react";
import { walletStore } from "../stores/wallet_store";
import type { TAsset } from "../queries/vault";
import { useSolanaSelector } from "./useSolanaSelector";

export const useWalletSelector = () => {
  const wagmiSelector = useWagmiSelector();
  const solanaSelector = useSolanaSelector();

  const signMessage = useCallback(
    async (message: string) => {
      const selectedChain = walletStore.store.get().context.selectedChain;
      if (selectedChain === "arbitrum" || selectedChain === "eth") {
        return wagmiSelector.signMessage(message);
      } else if (selectedChain === "solana") {
        return solanaSelector.signMessage(message);
      } else {
        throw new Error("Unsupported selected chain");
      }
    },
    [wagmiSelector, solanaSelector]
  );

  const requestDeposit = useCallback(
    async (args: {
      asset: TAsset;
      amount: bigint;
      receiver_address: `0x${string}` | string;
    }) => {
      const selectedChain = walletStore.store.get().context.selectedChain;
      if (selectedChain === "arbitrum" || selectedChain === "eth") {
        return wagmiSelector.requestDeposit({
          receiver_address: args.receiver_address as `0x${string}`,
          chain_name: selectedChain,
          amount: args.amount,
          asset: args.asset,
        });
      } else if (selectedChain === "solana") {
        return solanaSelector.requestDeposit({
          receiver_address: args.receiver_address,
          chain_name: selectedChain,
          amount: args.amount,
          asset: args.asset,
        });
      } else {
        throw new Error("Unsupported selected chain");
      }
    },
    [wagmiSelector, solanaSelector]
  );

  const signIn = useCallback(
    async (adapterType: "evm" | "sol") => {
      if (adapterType === "evm") {
        await wagmiSelector.signIn();
      } else if (adapterType === "sol") {
        await solanaSelector.signIn();
      } else {
        throw new Error("Adapter not found");
      }
    },
    [wagmiSelector, solanaSelector]
  );

  const signOut = useCallback(async () => {
    const selectedChain = walletStore.store.get().context.selectedChain;
    if (selectedChain === "arbitrum" || selectedChain === "eth") {
      await wagmiSelector.signOut();
    } else if (selectedChain === "solana") {
      await solanaSelector.signIn();
    } else {
      throw new Error("Adapter not found");
    }

    walletStore.store.trigger.disconnectSelectedChainWallet();
  }, [wagmiSelector, solanaSelector]);

  const getBalance = useCallback(
    async (args: { asset: TAsset; address: string }) => {
      const selectedChain = walletStore.store.get().context.selectedChain;
      if (selectedChain === "arbitrum" || selectedChain === "eth") {
        return wagmiSelector.getBalance({
          address: args.address,
          asset: args.asset,
          chain_name: selectedChain,
        });
      } else if (selectedChain === "solana") {
        return solanaSelector.getBalance({
          address: args.address,
          asset: args.asset,
          chain_name: selectedChain,
        });
      } else {
        throw new Error("Adapter not found");
      }
    },
    [wagmiSelector, solanaSelector]
  );

  return {
    signMessage,
    requestDeposit,
    signIn,
    getBalance,
    signOut,
  };
};
