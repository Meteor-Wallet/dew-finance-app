import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { produce } from "immer";

const store = createStore({
  context: {
    isConnectWalletModalOpen: false,
    isSwitchNetworkModalOpen: false,
    isOnboardModalOpen: false,
    connectedWallets: [],
    selectedChain: undefined,
  } as {
    isSwitchNetworkModalOpen: boolean;
    isConnectWalletModalOpen: boolean;
    isOnboardModalOpen: boolean;
    // TODO: type this later
    connectedWallets: any[];
    selectedChain?: "ETH" | "ARB" | "NEAR" | "SOLANA";
  },
  on: {
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
  },
});

const useIsWalletConnected = () => {
  return useSelector(
    store,
    ({ context }) => context.connectedWallets.length > 0
  );
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

export const walletStore = {
  store,
  selectors: {
    useIsWalletConnected,
    useIsConnectWalletModalOpen,
    useIsSwitchNetworkModalOpen,
    useIsOnboardModalOpen,
  },
};
