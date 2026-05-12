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

const SELECTED_CHAIN_KEY = "last_selected_chain_name";

const getPersistedChain = (): ChainName => {
  try {
    const raw = localStorage.getItem(SELECTED_CHAIN_KEY);
    if (raw) return zChainName.parse(JSON.parse(raw));
  } catch {
    // ignore
  }
  return "near";
};

export interface WalletState {
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

export const useWalletStore = create<WalletState>()(
  subscribeWithSelector((set, get) => ({
    isConnectWalletModalOpen: false,
    isSwitchNetworkModalOpen: false,
    isOnboardModalOpen: false,
    connectedWallets: [],
    selectedChain: getPersistedChain(),
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
  (chain) => localStorage.setItem(SELECTED_CHAIN_KEY, JSON.stringify(chain))
);

export const useConnectedWalletAddress = () =>
  useWalletStore((s) =>
    s.connectedWallets.find((e) => e.supportedChains.includes(s.selectedChain))
  );
