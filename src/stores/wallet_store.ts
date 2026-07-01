import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type EvmChainName =
  | "eth"
  | "arbitrum"
  | "monad"
  | "plasma"
  | "polygon"
  | "base"
  | "bsc"
  | "bera";
export type SolanaChainName = "solana";
export type NearChainName = "near";
export type ZecChainName = "zec"
export type ChainName = EvmChainName | SolanaChainName | NearChainName | ZecChainName;

export interface WalletState {
  isConnectWalletModalOpen: boolean;
  isSolanaWalletModalOpen: boolean;
  isEvmWalletModalOpen: boolean;
  isSwitchNetworkModalOpen: boolean;
  isOnboardModalOpen: boolean;
  isWithdrawStaleFundsModalOpen: boolean;
  connectedWallets: { address: string; supportedChains: ChainName[] }[];
  nearAccountId: string | null;
  pendingAbstractAccountCreation: { address: string; chain: ChainName } | null;
  openConnectWalletModal: () => void;
  closeConnectWalletModal: () => void;
  openSolanaWalletModal: () => void;
  closeSolanaWalletModal: () => void;
  openEvmWalletModal: () => void;
  closeEvmWalletModal: () => void;
  openSwitchNetworkModal: () => void;
  closeSwitchNetworkModal: () => void;
  openOnboardModal: () => void;
  closeOnboardModal: () => void;
  openWithdrawStaleFundsModal: () => void;
  closeWithdrawStaleFundsModal: () => void;
  setPendingAbstractAccountCreation: (pending: { address: string; chain: ChainName } | null) => void;
  connectWallet: (event: {
    address: string;
    supportedChains: ChainName[];
  }) => void;
  disconnectChainWallet: (chain: ChainName) => void;
  setCurrentNearAccountId: (event: { nearAccountId: string | null }) => void;
}

export const useWalletStore = create<WalletState>()(
  subscribeWithSelector((set, get) => ({
    isConnectWalletModalOpen: false,
    isSolanaWalletModalOpen: false,
    isEvmWalletModalOpen: false,
    isSwitchNetworkModalOpen: false,
    isOnboardModalOpen: false,
    isWithdrawStaleFundsModalOpen: false,
    connectedWallets: [],
    nearAccountId: null,
    pendingAbstractAccountCreation: null,

    openConnectWalletModal: () => set({ isConnectWalletModalOpen: true }),
    closeConnectWalletModal: () => set({ isConnectWalletModalOpen: false }),
    openSolanaWalletModal: () => set({ isSolanaWalletModalOpen: true }),
    closeSolanaWalletModal: () => set({ isSolanaWalletModalOpen: false }),
    openEvmWalletModal: () => set({ isEvmWalletModalOpen: true }),
    closeEvmWalletModal: () => set({ isEvmWalletModalOpen: false }),
    openSwitchNetworkModal: () => set({ isSwitchNetworkModalOpen: true }),
    closeSwitchNetworkModal: () => set({ isSwitchNetworkModalOpen: false }),
    openOnboardModal: () => set({ isOnboardModalOpen: true }),
    closeOnboardModal: () => set({ isOnboardModalOpen: false }),
    openWithdrawStaleFundsModal: () => set({ isWithdrawStaleFundsModalOpen: true }),
    closeWithdrawStaleFundsModal: () => set({ isWithdrawStaleFundsModalOpen: false }),

    connectWallet: ({ address, supportedChains }) => {
      if (get().connectedWallets.find((e) => e.address === address)) return;
      set((s) => ({
        connectedWallets: [...s.connectedWallets, { address, supportedChains }],
      }));
    },

    disconnectChainWallet: (chain) => {
      set((s) => ({
        connectedWallets: s.connectedWallets.filter(
          (e) => !e.supportedChains.includes(chain)
        ),
      }));
    },

    setCurrentNearAccountId: ({ nearAccountId }) => set({ nearAccountId }),
    setPendingAbstractAccountCreation: (pending) => set({ pendingAbstractAccountCreation: pending }),
  }))
);

// Returns the first connected wallet with NEAR priority, then Solana, then EVM.
const pickPrimaryWallet = (wallets: WalletState["connectedWallets"]) =>
  wallets.find((w) => w.supportedChains.includes("near")) ??
  wallets.find((w) => w.supportedChains.includes("solana")) ??
  wallets.find((w) => w.supportedChains.includes("eth")) ??
  null;

export const useConnectedWalletAddress = () =>
  useWalletStore((s) => pickPrimaryWallet(s.connectedWallets));