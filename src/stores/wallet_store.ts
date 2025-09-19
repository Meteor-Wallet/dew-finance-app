import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { produce } from "immer";
import type { SupportedChainName } from "../intents/types/base";

const EvmChains = ["eth", "arbitrum"] as const satisfies SupportedChainName[];
const SolanaChains = ["solana"] as const satisfies SupportedChainName[];

export type EvmChainName = (typeof EvmChains)[number];
export type SolanaChainName = (typeof SolanaChains)[number];
export type ChainName = EvmChainName | SolanaChainName;

const store = createStore({
  context: {
    isDepositWalletModalOpen: false,
    isRedeemWalletModalOpen: false,
    isConnectWalletModalOpen: false,
    isSwitchNetworkModalOpen: false,
    isOnboardModalOpen: false,
    connectedWallets: [],
    selectedChain: "eth",
    nearAccountId: null,
  } as {
    isSwitchNetworkModalOpen: boolean;
    isDepositWalletModalOpen: boolean;
    isRedeemWalletModalOpen: boolean;
    isConnectWalletModalOpen: boolean;
    isOnboardModalOpen: boolean;
    connectedWallets: {
      address: string;
      supportedChains: ChainName[];
    }[];
    selectedChain: ChainName;
    nearAccountId: string | null;
  },
  on: {
    openRedeemWalletModal: (context) =>
      produce(context, (draft) => {
        draft.isRedeemWalletModalOpen = true;
      }),
    closeRedeemWalletModal: (context) =>
      produce(context, (draft) => {
        draft.isRedeemWalletModalOpen = false;
      }),
    openDepositWalletModal: (context) =>
      produce(context, (draft) => {
        draft.isDepositWalletModalOpen = true;
      }),
    closeDepositWalletModal: (context) =>
      produce(context, (draft) => {
        draft.isDepositWalletModalOpen = false;
      }),
    openConnectWalletModal: (context) =>
      produce(context, (draft) => {
        draft.isConnectWalletModalOpen = true;
      }),
    closeConnectWalletModal: (context) =>
      produce(context, (draft) => {
        draft.isConnectWalletModalOpen = false;
      }),
    openSwitchNetworkModal: (context) =>
      produce(context, (draft) => {
        draft.isSwitchNetworkModalOpen = true;
      }),
    closeSwitchNetworkModal: (context) =>
      produce(context, (draft) => {
        draft.isSwitchNetworkModalOpen = false;
      }),
    openOnboardModal: (context) =>
      produce(context, (draft) => {
        draft.isOnboardModalOpen = true;
      }),
    closeOnboardModal: (context) =>
      produce(context, (draft) => {
        draft.isOnboardModalOpen = false;
      }),
    connectWallet: (
      context,
      event: {
        address: string;
        supportedChains: ChainName[];
        selectedChain: ChainName;
      }
    ) =>
      produce(context, (draft) => {
        if (context.connectedWallets.find((e) => e.address === event.address)) {
          return;
        }
        draft.connectedWallets.push({
          address: event.address,
          supportedChains: event.supportedChains,
        });
        draft.selectedChain = event.selectedChain;
      }),
    disconnectSelectedChainWallet: (context) =>
      produce(context, (draft) => {
        const currentChain = context.selectedChain;

        const remainingConnectedWallets = context.connectedWallets.filter(
          (e) => !e.supportedChains.includes(currentChain)
        );

        if (remainingConnectedWallets.length > 0) {
          draft.selectedChain = remainingConnectedWallets[0].supportedChains[0];
        }

        draft.connectedWallets = remainingConnectedWallets;
      }),
    switchChain: (context, event: { chain: ChainName }, enqueue) => {
      enqueue.emit.switchChain({
        chain: event.chain,
      });
      return produce(context, (draft) => {
        draft.selectedChain = event.chain;
        draft.isSwitchNetworkModalOpen = false;
      });
    },
    setCurrentNearAccountId: (
      context,
      event: {
        nearAccountId: string | null;
      }
    ) =>
      produce(context, (draft) => {
        draft.nearAccountId = event.nearAccountId;
      }),
  },
  emits: {
    switchChain: (_payload: { chain: ChainName }) => {},
  },
});

/**
 * selectedChain aware
 */
const useConnectedWalletAddress = () => {
  const selectedChain = useSelector(
    store,
    ({ context }) => context.selectedChain
  );
  const connectedWallets = useSelector(
    store,
    ({ context }) => context.connectedWallets
  );

  return connectedWallets.find((e) =>
    e.supportedChains.includes(selectedChain)
  );
};

const useIsRedeemWalletModalOpen = () => {
  return useSelector(store, ({ context }) => context.isRedeemWalletModalOpen);
};

const useIsDepositWalletModalOpen = () => {
  return useSelector(store, ({ context }) => context.isDepositWalletModalOpen);
};

const useIsConnectWalletModalOpen = () => {
  return useSelector(store, ({ context }) => context.isConnectWalletModalOpen);
};

const useIsSwitchNetworkModalOpen = () => {
  return useSelector(store, ({ context }) => context.isSwitchNetworkModalOpen);
};

const useIsOnboardModalOpen = () => {
  return useSelector(store, ({ context }) => context.isOnboardModalOpen);
};

const useSelectedChain = () => {
  return useSelector(store, ({ context }) => context.selectedChain);
};

const useCurrentNearAccountId = () => {
  return useSelector(store, ({ context }) => context.nearAccountId);
};

export const walletStore = {
  store,
  selectors: {
    useIsConnectWalletModalOpen,
    useIsDepositWalletModalOpen,
    useIsRedeemWalletModalOpen,
    useIsSwitchNetworkModalOpen,
    useIsOnboardModalOpen,
    useSelectedChain,
    useConnectedWalletAddress,
    useCurrentNearAccountId,
  },
};
