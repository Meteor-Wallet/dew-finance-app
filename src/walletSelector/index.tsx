import { useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import type { Connector } from "wagmi";
import { useWalletStore } from "../stores/wallet_store";
import { nearConnector } from "../nearConnector";
import type { TAsset } from "../queries/vault";

export const useWalletSelector = () => {
  // ── Solana ────────────────────────────────────────────────────────────────
  const { select, connect: solanaConnect, disconnect: solanaDisconnect, publicKey, connected: solanaConnected } = useWallet();

  useEffect(() => {
    if (solanaConnected && publicKey) {
      useWalletStore.getState().connectWallet({
        address: publicKey.toBase58(),
        supportedChains: ["solana"],
      });
      useWalletStore.getState().closeSolanaWalletModal();
    }
  }, [solanaConnected, publicKey]);

  useEffect(() => {
    if (!solanaConnected && !publicKey) {
      useWalletStore.getState().disconnectChainWallet("solana");
    }
  }, [solanaConnected, publicKey]);

  // ── EVM ───────────────────────────────────────────────────────────────────
  const { connect: evmConnect } = useConnect();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { address: evmAddress, isConnected: evmConnected } = useAccount();

  useEffect(() => {
    if (evmConnected && evmAddress) {
      useWalletStore.getState().connectWallet({
        address: evmAddress,
        supportedChains: ["eth", "arbitrum"],
      });
      useWalletStore.getState().closeEvmWalletModal();
    }
  }, [evmConnected, evmAddress]);

  useEffect(() => {
    if (!evmConnected) {
      useWalletStore.getState().disconnectChainWallet("eth");
      useWalletStore.getState().disconnectChainWallet("arbitrum");
    }
  }, [evmConnected]);

  // ── Shared API ────────────────────────────────────────────────────────────
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
    (adapterType: "evm" | "sol" | "near", options?: { walletName?: string; connector?: Connector }) => Promise<void>
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
        await solanaConnect().catch(() => {});
        return;
      }
      if (adapterType === "evm") {
        const connector = options?.connector;
        if (!connector) throw new Error("connector required for evm");
        evmConnect({ connector });
        return;
      }
    },
    [select, solanaConnect, evmConnect]
  );

  const signOutChain = useCallback(async (chain: "near" | "solana" | "eth" | "arbitrum") => {
    if (chain === "near") {
      const result = await nearConnector.getConnectedWallet().catch(() => null);
      if (result) await nearConnector.disconnect(result.wallet);
      else useWalletStore.getState().disconnectChainWallet("near");
      return;
    }
    if (chain === "solana") {
      await solanaDisconnect();
      return;
    }
    if (chain === "eth" || chain === "arbitrum") {
      evmDisconnect();
      return;
    }
  }, [solanaDisconnect, evmDisconnect]);

  return { requestDeposit, signIn, signOutChain };
};
