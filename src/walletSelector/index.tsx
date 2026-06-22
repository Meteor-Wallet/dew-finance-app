import { useCallback, useMemo } from "react";
import type { Connector } from "wagmi";
import { useWalletStore } from "../stores/wallet_store";
import type { ChainName } from "../stores/wallet_store";
import { nearConnector } from "../nearConnector";
import { useEvmWallet } from "./useEvmWallet";
import { useSolanaWallet } from "./useSolanaWallet";
import type { ChainAdapter } from "./types";

export const useWalletSelector = () => {
  const evmAdapter = useEvmWallet();
  const solanaAdapter = useSolanaWallet();

  const adapters: ChainAdapter[] = useMemo(
    () => [evmAdapter, solanaAdapter],
    [evmAdapter, solanaAdapter],
  );

  const requestDeposit = useCallback(
    async (args: {
      contractAddress: string;
      amount: bigint;
      receiverAddress: string;
      chain: ChainName;
      decimals: number;
    }) => {
      const adapter = adapters.find((a) => a.chains.includes(args.chain));
      if (!adapter) throw new Error(`Unsupported chain for deposit: ${args.chain}`);
      return adapter.requestDeposit(args);
    },
    [adapters],
  );

  const signIn = useCallback(
    async (
      adapterType: "evm" | "sol" | "near",
      options?: { walletName?: string; connector?: Connector },
    ) => {
      if (adapterType === "near") {
        await nearConnector.connect();
        return;
      }
      if (adapterType === "evm") return evmAdapter.signIn(options);
      if (adapterType === "sol") return solanaAdapter.signIn(options);
    },
    [evmAdapter, solanaAdapter],
  );

  const signOutChain = useCallback(
    async (chain: ChainName) => {
      if (chain === "near") {
        const result = await nearConnector.getConnectedWallet().catch(() => null);
        if (result) await nearConnector.disconnect(result.wallet);
        else useWalletStore.getState().disconnectChainWallet("near");
        return;
      }
      const adapter = adapters.find((a) => a.chains.includes(chain));
      if (!adapter) throw new Error(`Unsupported chain for sign out: ${chain}`);
      return adapter.signOut();
    },
    [adapters],
  );

  const signMessage = useCallback(
    async (chain: ChainName, message: string) => {
      const adapter = adapters.find((a) => a.chains.includes(chain));
      if (!adapter) throw new Error(`Unsupported chain for signing: ${chain}`);
      return adapter.signMessage(message);
    },
    [adapters],
  );

  return { requestDeposit, signIn, signOutChain, signMessage };
};
