import { useCallback, useEffect, useRef } from "react";
import { getNoirWallet, type ZcashAPI, type ZcashAddress } from "@noir-wallet/sdk";
import Big from "big.js";
import { useWalletStore } from "../stores/wallet_store";
import type { ChainAdapter } from "./types";

export function useZecWallet(): ChainAdapter {
  const zcashRef = useRef<ZcashAPI | null>(null);

  useEffect(() => {
    const wallet = getNoirWallet();
    if (!wallet) return;

    const api = wallet.zcash;
    zcashRef.current = api;

    // Silently check for an existing authorized connection (no popup)
    api.getAccounts().then((address) => {
      if (address) {
        useWalletStore.getState().connectWallet({
          address: address.transparent,
          supportedChains: ["zec"],
        });
      }
    });

    // Sync wallet store when the user locks, unlocks, or switches account
    const handleAccountsChanged = (address: ZcashAddress | null) => {
      if (address) {
        useWalletStore.getState().connectWallet({
          address: address.transparent,
          supportedChains: ["zec"],
        });
      } else {
        useWalletStore.getState().disconnectChainWallet("zec");
      }
    };

    api.on("accountsChanged", handleAccountsChanged);
    return () => api.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  const requestDeposit = useCallback(
    async ({ receiverAddress, amount, decimals }: {
      contractAddress: string;
      amount: bigint;
      receiverAddress: string;
      decimals: number;
    }) => {
      if (!zcashRef.current) throw new Error("Noir Wallet not connected");
      const zecAmount = Big(amount.toString()).div(Big(10).pow(decimals)).toFixed(decimals);
      return zcashRef.current.sendTransaction({ to: receiverAddress, amount: zecAmount });
    },
    [],
  );

  const signIn = useCallback(async () => {
    const wallet = getNoirWallet();
    if (!wallet) throw new Error("Noir Wallet extension is not installed");
    const address = await wallet.zcash.connect();
    zcashRef.current = wallet.zcash;
    useWalletStore.getState().connectWallet({
      address: address.transparent,
      supportedChains: ["zec"],
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!zcashRef.current) return;
    await zcashRef.current.disconnect();
    useWalletStore.getState().disconnectChainWallet("zec");
  }, []);

  const signMessage = useCallback(async (message: string) => {
    if (!zcashRef.current) throw new Error("Noir Wallet not connected");
    const result = await zcashRef.current.signMessage(message);
    return result.signature;
  }, []);

  return {
    chains: ["zec"],
    requestDeposit,
    signIn,
    signOut,
    signMessage,
  };
}
