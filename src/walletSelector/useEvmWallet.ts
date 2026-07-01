import { useCallback, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useSwitchChain, useSignMessage } from "wagmi";
import { useWalletStore, type ChainName, type EvmChainName } from "../stores/wallet_store";
import type { ChainAdapter } from "./types";
import type { Connector } from "wagmi";
import { evmUtils } from "../utils/evmUtils";

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

const supportedChains: EvmChainName[] = [
  "eth",
  "arbitrum",
  "monad",
  "plasma",
  "polygon",
  "bsc",
  "base",
  "bera"
]

export function useEvmWallet(): ChainAdapter {
  const { connect: evmConnect } = useConnect();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync: evmSignMessageAsync } = useSignMessage();

  useEffect(() => {
    if (evmConnected && evmAddress) {
      useWalletStore.getState().connectWallet({
        address: evmAddress,
        supportedChains
      });
      useWalletStore.getState().closeEvmWalletModal();
    }
  }, [evmConnected, evmAddress]);

  useEffect(() => {
    if (!evmConnected) {
      supportedChains.map(v => {
        useWalletStore.getState().disconnectChainWallet(v);
      })
    }
  }, [evmConnected]);

  const requestDeposit = useCallback(
    async ({ contractAddress, amount, receiverAddress, chain }: {
      contractAddress: string;
      amount: bigint;
      receiverAddress: string;
      decimals: number;
      chain: ChainName
    }) => {
      const chainId = evmUtils.chainToWagmiChainId(chain)

      await switchChainAsync({ chainId });
      
      return writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [receiverAddress as `0x${string}`, amount],
      });
    },
    [writeContractAsync, switchChainAsync],
  );

  const signIn = useCallback(
    async (options?: { connector?: Connector }) => {
      const connector = options?.connector;
      if (!connector) throw new Error("connector required for evm");
      evmConnect({ connector });
    },
    [evmConnect],
  );

  const signOut = useCallback(async () => {
    evmDisconnect();
  }, [evmDisconnect]);

  const signMessage = useCallback(
    async (message: string) => evmSignMessageAsync({ message }),
    [evmSignMessageAsync],
  );

  return {
    chains: supportedChains,
    requestDeposit,
    signIn,
    signOut,
    signMessage,
  };
}
