import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { SupportedChainName } from "../intents/types/base";
import z from "zod";

export type EvmChainName = Extract<SupportedChainName, "eth" | "arbitrum">;
export type SolanaChainName = Extract<SupportedChainName, "solana">;
export type NearChainName = Extract<SupportedChainName, "near">;
export type ChainName = EvmChainName | SolanaChainName | NearChainName;

const zChainName = z.union([
  z.literal("eth"),
  z.literal("arbitrum"),
  z.literal("solana"),
]);

const selectedChainNameStorageKey = "last_selected_chain_name";

const defaultSelectedChain: ChainName = (() => {
  try {
    const raw = localStorage.getItem(selectedChainNameStorageKey);
    if (raw) return zChainName.parse(JSON.parse(raw));
  } catch {
    // ignore
  }
  return "eth";
})();

interface WalletState {
  isConnectWalletModalOpen: boolean;
  isSwitchNetworkModalOpen: boolean;
  isOnboardModalOpen: boolean;
  connectedWallets: { address: string; supportedChains: ChainName[] }[];
  selectedChain: ChainName;
  nearAccountId: string | null;
  openConnectWalletModal: () => void;
  closeConnectWalletModal: () => void;
  openSwitchNetworkModal: () => void;
  closeSwitchNetworkModal: () => void;
  openOnboardModal: () => void;
  closeOnboardModal: () => void;
  connectWallet: (event: {
    address: string;
    supportedChains: ChainName[];
    selectedChain: ChainName;
  }) => void;
  disconnectSelectedChainWallet: () => void;
  switchChain: (event: { chain: ChainName }) => void;
  setCurrentNearAccountId: (event: { nearAccountId: string | null }) => void;
}

const useWalletStore = create<WalletState>()(
  subscribeWithSelector((set, get) => ({
    isConnectWalletModalOpen: false,
    isSwitchNetworkModalOpen: false,
    isOnboardModalOpen: false,
    connectedWallets: [],
    selectedChain: defaultSelectedChain,
    nearAccountId: null,

    openConnectWalletModal: () => set({ isConnectWalletModalOpen: true }),
    closeConnectWalletModal: () => set({ isConnectWalletModalOpen: false }),
    openSwitchNetworkModal: () => set({ isSwitchNetworkModalOpen: true }),
    closeSwitchNetworkModal: () => set({ isSwitchNetworkModalOpen: false }),
    openOnboardModal: () => set({ isOnboardModalOpen: true }),
    closeOnboardModal: () => set({ isOnboardModalOpen: false }),

    connectWallet: ({ address, supportedChains, selectedChain }) => {
      const state = get();
      if (state.connectedWallets.find((e) => e.address === address)) return;
      set((s) => ({
        selectedChain:
          s.connectedWallets.length === 0 ? selectedChain : s.selectedChain,
        connectedWallets: [...s.connectedWallets, { address, supportedChains }],
      }));
    },

    disconnectSelectedChainWallet: () => {
      const { selectedChain, connectedWallets } = get();
      set({
        connectedWallets: connectedWallets.filter(
          (e) => !e.supportedChains.includes(selectedChain)
        ),
      });
    },

    switchChain: ({ chain }) =>
      set({ selectedChain: chain, isSwitchNetworkModalOpen: false }),

    setCurrentNearAccountId: ({ nearAccountId }) => set({ nearAccountId }),
  }))
);

useWalletStore.subscribe(
  (s) => s.selectedChain,
  (chain) =>
    localStorage.setItem(selectedChainNameStorageKey, JSON.stringify(chain))
);

const useConnectedWalletAddress = () =>
  useWalletStore((s) =>
    s.connectedWallets.find((e) => e.supportedChains.includes(s.selectedChain))
  );

const useIsConnectWalletModalOpen = () =>
  useWalletStore((s) => s.isConnectWalletModalOpen);
const useIsSwitchNetworkModalOpen = () =>
  useWalletStore((s) => s.isSwitchNetworkModalOpen);
const useIsOnboardModalOpen = () =>
  useWalletStore((s) => s.isOnboardModalOpen);
const useSelectedChain = () => useWalletStore((s) => s.selectedChain);
const useCurrentNearAccountId = () => useWalletStore((s) => s.nearAccountId);
const useConnectedWallets = () => useWalletStore((s) => s.connectedWallets);

const store = {
  trigger: {
    openConnectWalletModal: () =>
      useWalletStore.getState().openConnectWalletModal(),
    closeConnectWalletModal: () =>
      useWalletStore.getState().closeConnectWalletModal(),
    openSwitchNetworkModal: () =>
      useWalletStore.getState().openSwitchNetworkModal(),
    closeSwitchNetworkModal: () =>
      useWalletStore.getState().closeSwitchNetworkModal(),
    openOnboardModal: () => useWalletStore.getState().openOnboardModal(),
    closeOnboardModal: () => useWalletStore.getState().closeOnboardModal(),
    connectWallet: (e: {
      address: string;
      supportedChains: ChainName[];
      selectedChain: ChainName;
    }) => useWalletStore.getState().connectWallet(e),
    disconnectSelectedChainWallet: () =>
      useWalletStore.getState().disconnectSelectedChainWallet(),
    switchChain: (e: { chain: ChainName }) =>
      useWalletStore.getState().switchChain(e),
    setCurrentNearAccountId: (e: { nearAccountId: string | null }) =>
      useWalletStore.getState().setCurrentNearAccountId(e),
  },
  get: () => ({ context: useWalletStore.getState() }),
  select: <T>(
    selector: (state: WalletState) => T,
    equalityFn?: (a: T, b: T) => boolean
  ) => ({
    subscribe: (cb: (val: T) => void) =>
      useWalletStore.subscribe(
        selector,
        cb,
        equalityFn ? { equalityFn } : undefined
      ),
  }),
};

export const walletStore = {
  store,
  selectors: {
    useIsConnectWalletModalOpen,
    useIsSwitchNetworkModalOpen,
    useIsOnboardModalOpen,
    useSelectedChain,
    useConnectedWalletAddress,
    useCurrentNearAccountId,
    useConnectedWallets,
  },
};
