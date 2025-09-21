import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import Big from "big.js";
import { useCallback, useEffect } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { walletStore, type SolanaChainName } from "../stores/wallet_store";
import type { TAsset } from "../queries/vault";
import { FLAT_LIST_TOKENS } from "../intents/constants/tokens";

export const useSolanaSelector = () => {
  const { setVisible } = useWalletModal();

  const { connection } = useConnection();
  const {
    disconnect: walletDisconnect,
    connected: walletConnected,
    signMessage: walletSignMessage,
    publicKey,
    sendTransaction: walletSendTransaction,
    select,
  } = useWallet();

  useEffect(() => {
    if (walletConnected && publicKey) {
      walletStore.store.trigger.connectWallet({
        address: publicKey.toString(),
        supportedChains: ["solana"],
        selectedChain: "solana",
      });
    }
  }, [walletConnected, publicKey]);

  const signMessage = useCallback(
    async (message: string) => {
      if (!walletSignMessage) {
        throw new Error("Wallet not found");
      }
      const encodedMessage = new TextEncoder().encode(message);

      const signature = await walletSignMessage(encodedMessage);
      return bs58.encode(signature);
    },
    [walletSignMessage]
  );

  const requestDeposit = useCallback(
    async ({
      asset,
      amount,
      receiver_address,
      chain_name,
    }: {
      asset: TAsset;
      amount: bigint;
      receiver_address: string;
      chain_name: SolanaChainName;
    }) => {
      if ("FungibleToken" in asset) {
        throw new Error("FungibleToken is not supported in EVM");
      }

      const intents_token_id = asset.MultiToken.token_id;

      const token_info = FLAT_LIST_TOKENS.find(
        (e) =>
          e.defuseAssetId === intents_token_id && e.chainName === chain_name
      );

      if (!token_info) {
        throw new Error("Unable to find token");
      }

      if (!publicKey) {
        throw new Error("Wallet not found");
      }

      const transaction = new Transaction();

      const receiverPublicKey = new PublicKey(receiver_address);

      if ("address" in token_info) {
        if (token_info.address === "native") {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: receiverPublicKey,
              lamports: BigInt(amount),
            })
          );
        } else {
          const sol_token_addr = token_info.address;
          const mint = new PublicKey(sol_token_addr);

          const fromTokenAccount = await getAssociatedTokenAddress(
            mint,
            publicKey
          );
          const toTokenAccount = await getAssociatedTokenAddress(
            mint,
            receiverPublicKey
          );

          const receiverAccount = await connection.getAccountInfo(
            toTokenAccount
          );

          if (receiverAccount === null) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                publicKey,
                toTokenAccount,
                new PublicKey(receiver_address),
                mint
              )
            );
          }

          transaction.add(
            createTransferInstruction(
              fromTokenAccount,
              toTokenAccount,
              publicKey,
              amount
            )
          );
        }
      } else {
        throw new Error("Unable to find token's address");
      }

      const signature = await walletSendTransaction(transaction, connection);

      const {
        value: {
          // blockhash,
          lastValidBlockHeight,
        },
      } = await connection.getLatestBlockhashAndContext();

      // keep polling until the transaction is confirmed
      // or block height exceeded
      while (true) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 1000);
        });

        const status = await connection.getSignatureStatus(signature);
        if (status.value) {
          if (status.value.err) {
            throw new Error("Unable to publish transaction. Please try again");
          } else {
            if (
              status.value.confirmationStatus === "confirmed" ||
              status.value.confirmationStatus === "finalized"
            ) {
              break;
            }
          }
        }

        const blockHeight = await connection.getBlockHeight();
        if (blockHeight > lastValidBlockHeight) {
          throw new Error("Block height exceeded. Please try again later.");
        }
      }

      return signature;
    },
    [connection, publicKey, walletSendTransaction]
  );

  const getBalance = useCallback(
    async ({
      asset,
      address,
      chain_name,
    }: {
      asset: TAsset;
      address: string;
      chain_name: SolanaChainName;
    }): Promise<{
      decimals: number;
      value: bigint;
      formatted: string;
    }> => {
      if ("FungibleToken" in asset) {
        throw new Error("FungibleToken is not supported in EVM");
      }

      const intents_token_id = asset.MultiToken.token_id;

      const token_info = FLAT_LIST_TOKENS.find(
        (e) =>
          e.defuseAssetId === intents_token_id && e.chainName === chain_name
      );

      if (!token_info) {
        throw new Error("Unable to find token");
      }

      if ("address" in token_info) {
        if (token_info.address === "native") {
          const balance = await connection.getBalance(new PublicKey(address));
          const decimals = 9;

          return {
            decimals: decimals,
            formatted: Big(balance).div(Big(10).pow(decimals)).toFixed(),
            value: BigInt(balance),
          };
        } else {
          const sol_token_addr = token_info.address;

          const mint = new PublicKey(sol_token_addr);

          const tokenAccount = await getAssociatedTokenAddress(
            mint,
            new PublicKey(address)
          );

          const result = await connection.getTokenAccountBalance(tokenAccount);

          return {
            decimals: result.value.decimals,
            formatted: Big(result.value.amount)
              .div(Big(10).pow(result.value.decimals))
              .toFixed(),
            value: BigInt(result.value.amount),
          };
        }
      } else {
        throw new Error("Unable to find token's address");
      }
    },
    [connection]
  );

  const signIn = useCallback(async () => {
    select(null);
    setVisible(true);
  }, [setVisible, select]);

  const signOut = useCallback(async () => {
    await walletDisconnect();
  }, [walletDisconnect]);

  return {
    signIn,
    signOut,
    requestDeposit,
    signMessage,
    getBalance,
  };
};
