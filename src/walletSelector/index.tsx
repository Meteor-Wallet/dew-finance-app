import { useWagmiSelector } from "./useWagmiSelector";
import { useCallback } from "react";
import { walletStore } from "../stores/wallet_store";

export const useWalletSelector = () => {
  const wagmiSelector = useWagmiSelector();

  const signMessage = useCallback(
    async (message: string) => {
      const selectedChain = walletStore.store.get().context.selectedChain;
      if (selectedChain === "arbitrum" || selectedChain === "eth") {
        return wagmiSelector.signMessage(message);
      } else {
        throw new Error("Unsupported selected chain");
      }
    },
    [wagmiSelector]
  );

  const requestDeposit = useCallback(
    async (args: {
      intents_token_id: string;
      amount: bigint;
      receiver_address: `0x${string}` | string;
    }) => {
      const selectedChain = walletStore.store.get().context.selectedChain;
      if (selectedChain === "arbitrum" || selectedChain === "eth") {
        return wagmiSelector.requestDeposit({
          receiver_address: args.receiver_address as `0x${string}`,
          chain_name: selectedChain,
          amount: args.amount,
          intents_token_id: args.intents_token_id,
        });
      } else {
        throw new Error("Unsupported selected chain");
      }
    },
    [wagmiSelector]
  );

  const signIn = useCallback(
    async (adapterType: "evm" | "sol") => {
      if (adapterType === "evm") {
        await wagmiSelector.signIn();
      } else {
        throw new Error("Adapter not found");
      }
    },
    [wagmiSelector]
  );

  const signOut = useCallback(async () => {
    const selectedChain = walletStore.store.get().context.selectedChain;
    if (selectedChain === "arbitrum" || selectedChain === "eth") {
      await wagmiSelector.signOut();
    } else {
      throw new Error("Adapter not found");
    }

    walletStore.store.trigger.disconnectSelectedChainWallet();
  }, [wagmiSelector]);

  const getBalance = useCallback(
    async (args: { intents_token_id: string; address: string }) => {
      const selectedChain = walletStore.store.get().context.selectedChain;
      if (selectedChain === "arbitrum" || selectedChain === "eth") {
        return wagmiSelector.getBalance({
          address: args.address,
          intents_token_id: args.intents_token_id,
          chain_name: selectedChain,
        });
      } else {
        throw new Error("Adapter not found");
      }
    },
    [wagmiSelector]
  );

  return {
    signMessage,
    requestDeposit,
    signIn,
    getBalance,
    signOut,
  };
};
