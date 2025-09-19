import { useCallback, useEffect } from "react";
import { erc20Abi, type Chain } from "viem";
import { useSendTransaction, useSignMessage, useWriteContract } from "wagmi";
import { getBalance as wagmiGetBalance } from "wagmi/actions";
import { arbitrum, mainnet } from "wagmi/chains";
import {
  createAppKit,
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useDisconnect,
} from "@reown/appkit/react";
import { type AppKitNetwork } from "@reown/appkit/networks";
import { walletStore, type EvmChainName } from "../stores/wallet_store";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { FLAT_LIST_TOKENS } from "../intents/constants/tokens";
import type { SupportedChainName } from "../intents/types/base";
import type { TAsset } from "../queries/vault";

const CHAIN_NAME_TO_CHAIN: {
  [network in SupportedChainName]?: Chain;
} = {
  arbitrum: arbitrum,
  eth: mainnet,
};

// 1. Get projectId from https://cloud.reown.com
const projectId = "489b92192c30c50efc2c2e8b9007f659";

// 3. Set the networks
const networks = [mainnet, arbitrum] satisfies [
  AppKitNetwork,
  ...AppKitNetwork[]
];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  // metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
    history: false,
    send: false,
  },
});

export const useWagmiSelector = () => {
  const { open, close } = useAppKit();
  const { isConnected, address } = useAppKitAccount({
    namespace: "eip155",
  });
  const { chainId, switchNetwork } = useAppKitNetwork();

  const { signMessageAsync: wagmiSignMessage } = useSignMessage();
  const { writeContractAsync: wagmiWriteContract } = useWriteContract();
  const { sendTransactionAsync: wagmiSendTransaction } = useSendTransaction();

  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected) {
      if (address && chainId) {
        const mappedChain = (() => {
          switch (chainId.toString()) {
            case "1":
              return "eth";
            case "42161":
              return "arbitrum";
            default:
              return undefined;
          }
        })();
        if (mappedChain) {
          walletStore.store.trigger.connectWallet({
            address,
            supportedChains: ["arbitrum", "eth"],
            selectedChain: mappedChain,
          });
        }
      }
    }
  }, [isConnected, chainId, address]);

  useEffect(() => {
    const listener = walletStore.store.on("switchChain", ({ chain }) => {
      if (chain === "arbitrum" || chain === "eth") {
        const mappedChain = CHAIN_NAME_TO_CHAIN[chain];

        if (!mappedChain) {
          throw new Error("Unable to map chain");
        }

        switchNetwork(mappedChain);
      }
    });

    return () => {
      listener.unsubscribe();
    };
  }, [switchNetwork]);

  useEffect(() => {
    if (isConnected) {
      // under unknown circumstances, the reown modal
      // decides to not close automatically after logging in
      // so we just close it here once wallet is connected
      close();
    }
  }, [isConnected, close]);

  const signMessage = useCallback(
    async (message: string) => {
      return await wagmiSignMessage({
        message: message,
      });
    },
    [wagmiSignMessage]
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
      receiver_address: `0x${string}`;
      chain_name: EvmChainName;
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
        throw new Error("Unable to map token");
      }

      const chain = CHAIN_NAME_TO_CHAIN[token_info.chainName];

      if (!chain) {
        throw new Error("Unable to map chain");
      }

      switchNetwork(chain);

      if ("address" in token_info) {
        if (token_info.address === "native") {
          const result = await wagmiSendTransaction({
            to: receiver_address,
            value: amount,
          });
          return result;
        } else {
          const result = await wagmiWriteContract({
            abi: erc20Abi,
            functionName: "transfer",
            args: [receiver_address, amount],
            address: token_info.address as `0x${string}`,
          });

          return result;
        }
      } else {
        throw new Error("Unable to find token's address");
      }
    },
    [wagmiSendTransaction, wagmiWriteContract, switchNetwork]
  );

  const getBalance = useCallback(
    async ({
      asset,
      address,
      chain_name,
    }: {
      asset: TAsset;
      address: string;
      chain_name: EvmChainName;
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
        throw new Error("Unable to map token");
      }

      const chain = CHAIN_NAME_TO_CHAIN[token_info.chainName];

      if (!chain) {
        throw new Error("Unable to map chain");
      }

      switchNetwork(chain);

      if ("address" in token_info) {
        const tokenAddress =
          token_info.address === "native"
            ? undefined
            : (token_info.address as `0x${string}`);

        const result = await wagmiGetBalance(wagmiAdapter.wagmiConfig, {
          address: address as `0x${string}`,
          token: tokenAddress,
          chainId: chain.id,
        });

        return result;
      } else {
        throw new Error("Unable to find token's address");
      }
    },
    [switchNetwork]
  );

  const signIn = useCallback(async () => {
    await open({
      view: "Connect",
      namespace: "eip155",
    });
  }, [open]);

  const signOut = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  return {
    signIn,
    signOut,
    requestDeposit,
    signMessage,
    getBalance,
  };
};
