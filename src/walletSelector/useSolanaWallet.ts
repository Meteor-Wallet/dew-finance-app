import { useCallback, useEffect } from "react";
import bs58 from "bs58";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { useWalletStore } from "../stores/wallet_store";
import type { ChainAdapter } from "./types";

export function useSolanaWallet(): ChainAdapter {
  const {
    select,
    connect: solanaConnect,
    disconnect: solanaDisconnect,
    publicKey,
    connected: solanaConnected,
    sendTransaction: solanaSendTransaction,
    signMessage: solanaSignMessage,
  } = useWallet();
  const { connection } = useConnection();

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

  const requestDeposit = useCallback(
    async ({ contractAddress, amount, receiverAddress, decimals }: {
      contractAddress: string;
      amount: bigint;
      receiverAddress: string;
      decimals: number;
    }) => {
      if (!publicKey || !solanaSendTransaction) {
        throw new Error("Solana wallet not connected");
      }
      const mintPubkey = new PublicKey(contractAddress);
      const receiverPubkey = new PublicKey(receiverAddress);

      const senderAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
      const receiverAta = await getAssociatedTokenAddress(mintPubkey, receiverPubkey);

      const tx = new Transaction();

      const receiverAtaInfo = await connection.getAccountInfo(receiverAta);
      if (!receiverAtaInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            receiverAta,
            receiverPubkey,
            mintPubkey,
          ),
        );
      }

      tx.add(
        createTransferCheckedInstruction(
          senderAta,
          mintPubkey,
          receiverAta,
          publicKey,
          amount,
          decimals,
        ),
      );

      return solanaSendTransaction(tx, connection);
    },
    [publicKey, solanaSendTransaction, connection],
  );

  const signIn = useCallback(
    async (options?: { walletName?: string }) => {
      const walletName = options?.walletName;
      if (!walletName) throw new Error("walletName required for solana");
      select(walletName as WalletName);
      await solanaConnect().catch(() => {});
    },
    [select, solanaConnect],
  );

  const signOut = useCallback(async () => {
    await solanaDisconnect();
  }, [solanaDisconnect]);

  const signMessage = useCallback(
    async (message: string) => {
      if (!solanaSignMessage) throw new Error("Solana wallet does not support message signing");
      const signed = await solanaSignMessage(new TextEncoder().encode(message));
      return bs58.encode(signed);
    },
    [solanaSignMessage],
  );

  return {
    chains: ["solana"],
    requestDeposit,
    signIn,
    signOut,
    signMessage,
  };
}
