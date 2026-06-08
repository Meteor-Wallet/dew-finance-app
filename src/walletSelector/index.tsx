import { useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferCheckedInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { useAccount, useConnect, useDisconnect, useWriteContract, useSwitchChain } from "wagmi";
import { mainnet, arbitrum } from "wagmi/chains";
import type { Connector } from "wagmi";
import { useWalletStore } from "../stores/wallet_store";
import type { ChainName } from "../stores/wallet_store";
import { nearConnector } from "../nearConnector";

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const useWalletSelector = () => {
  // ── Solana ────────────────────────────────────────────────────────────────
  const {
    select,
    connect: solanaConnect,
    disconnect: solanaDisconnect,
    publicKey,
    connected: solanaConnected,
    sendTransaction: solanaSendTransaction,
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

  // ── EVM ───────────────────────────────────────────────────────────────────
  const { connect: evmConnect } = useConnect();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

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

  /**
   * Sends tokens from the connected wallet to `receiverAddress`.
   * EVM: standard ERC-20 transfer.
   * Solana: SPL token transferChecked via associated token accounts.
   * Returns the transaction hash / signature.
   */
  const requestDeposit = useCallback(
    async (args: {
      contractAddress: string;
      amount: bigint;
      receiverAddress: string;
      chain: ChainName;
      decimals: number;
    }): Promise<string> => {
      const { contractAddress, amount, receiverAddress, chain, decimals } = args;

      if (chain === "eth" || chain === "arbitrum") {
        const chainId = chain === "eth" ? mainnet.id : arbitrum.id;
        await switchChainAsync({ chainId });
        const txHash = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [receiverAddress as `0x${string}`, amount],
        });
        return txHash;
      }

      if (chain === "solana") {
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
              publicKey,      // payer
              receiverAta,    // ata to create
              receiverPubkey, // owner
              mintPubkey,     // mint
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

        const signature = await solanaSendTransaction(tx, connection);
        return signature;
      }

      throw new Error(`Unsupported chain for deposit: ${chain}`);
    },
    [writeContractAsync, switchChainAsync, publicKey, solanaSendTransaction, connection],
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
    [select, solanaConnect, evmConnect],
  );

  const signOutChain = useCallback(
    async (chain: "near" | "solana" | "eth" | "arbitrum") => {
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
    },
    [solanaDisconnect, evmDisconnect],
  );

  return { requestDeposit, signIn, signOutChain };
};
