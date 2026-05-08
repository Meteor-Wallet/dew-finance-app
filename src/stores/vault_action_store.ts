import { create } from "zustand";
import type { TAsset } from "../queries/vault";

export type TMode = "deposit" | "withdraw";

interface VaultActionState {
  isDepositWalletModalOpen: boolean;
  isRedeemWalletModalOpen: boolean;
  isSimulateModalOpen: boolean;
  mode: TMode;
  selectedDepositAsset: TAsset | null;
  depositAmount: string;
  depositSlippagePercent: string;
  withdrawSlippagePercent: string;
  selectedWithdrawAsset: TAsset | null;
  withdrawAmount: string;
  openRedeemWalletModal: () => void;
  closeRedeemWalletModal: () => void;
  openDepositWalletModal: () => void;
  closeDepositWalletModal: () => void;
  openSimulateModal: () => void;
  closeSimulateModal: () => void;
  setInitialSelectedDepositAsset: (event: { assets: TAsset[] }) => void;
  changeDepositAsset: (event: { asset: TAsset }) => void;
  changeWithdrawAsset: (event: { asset: TAsset }) => void;
  setInitialSelectedWithdrawAsset: (event: { assets: TAsset[] }) => void;
  changeMode: (event: { mode: TMode }) => void;
  updateDepositAmount: (event: { amount: string }) => void;
  updateWithdrawAmount: (event: { amount: string }) => void;
}

const useVaultActionStore = create<VaultActionState>()((set) => ({
  isDepositWalletModalOpen: false,
  isRedeemWalletModalOpen: false,
  isSimulateModalOpen: false,
  mode: "deposit",
  selectedDepositAsset: null,
  depositAmount: "",
  depositSlippagePercent: "1",
  withdrawSlippagePercent: "1",
  selectedWithdrawAsset: null,
  withdrawAmount: "",

  openRedeemWalletModal: () => set({ isRedeemWalletModalOpen: true }),
  closeRedeemWalletModal: () => set({ isRedeemWalletModalOpen: false }),
  openDepositWalletModal: () => set({ isDepositWalletModalOpen: true }),
  closeDepositWalletModal: () => set({ isDepositWalletModalOpen: false }),
  openSimulateModal: () => set({ isSimulateModalOpen: true }),
  closeSimulateModal: () => set({ isSimulateModalOpen: false }),

  setInitialSelectedDepositAsset: ({ assets }) =>
    set({ selectedDepositAsset: assets.length > 0 ? assets[0] : null }),

  changeDepositAsset: ({ asset }) => set({ selectedDepositAsset: asset }),
  changeWithdrawAsset: ({ asset }) => set({ selectedWithdrawAsset: asset }),

  setInitialSelectedWithdrawAsset: ({ assets }) =>
    set({ selectedWithdrawAsset: assets.length > 0 ? assets[0] : null }),

  changeMode: ({ mode }) =>
    set(mode === "deposit" ? { mode, depositAmount: "" } : { mode, withdrawAmount: "" }),

  updateDepositAmount: ({ amount }) => {
    if (!isNaN(Number(amount))) set({ depositAmount: amount });
  },

  updateWithdrawAmount: ({ amount }) => {
    if (!isNaN(Number(amount))) set({ withdrawAmount: amount });
  },
}));

const useIsRedeemWalletModalOpen = () =>
  useVaultActionStore((s) => s.isRedeemWalletModalOpen);
const useIsDepositWalletModalOpen = () =>
  useVaultActionStore((s) => s.isDepositWalletModalOpen);
const useIsSimulateModalOpen = () =>
  useVaultActionStore((s) => s.isSimulateModalOpen);
const useMode = () => useVaultActionStore((s) => s.mode);
const useSelectedDepositAsset = () =>
  useVaultActionStore((s) => s.selectedDepositAsset);
const useSelectedWithdrawAsset = () =>
  useVaultActionStore((s) => s.selectedWithdrawAsset);
const useDepositAmount = () => useVaultActionStore((s) => s.depositAmount);
const useWithdrawAmount = () => useVaultActionStore((s) => s.withdrawAmount);
const useDepositSlippagePercent = () =>
  useVaultActionStore((s) => s.depositSlippagePercent);
const useWithdrawSlippagePercent = () =>
  useVaultActionStore((s) => s.withdrawSlippagePercent);

const store = {
  trigger: {
    openRedeemWalletModal: () =>
      useVaultActionStore.getState().openRedeemWalletModal(),
    closeRedeemWalletModal: () =>
      useVaultActionStore.getState().closeRedeemWalletModal(),
    openDepositWalletModal: () =>
      useVaultActionStore.getState().openDepositWalletModal(),
    closeDepositWalletModal: () =>
      useVaultActionStore.getState().closeDepositWalletModal(),
    openSimulateModal: () => useVaultActionStore.getState().openSimulateModal(),
    closeSimulateModal: () =>
      useVaultActionStore.getState().closeSimulateModal(),
    setInitialSelectedDepositAsset: (e: { assets: TAsset[] }) =>
      useVaultActionStore.getState().setInitialSelectedDepositAsset(e),
    changeDepositAsset: (e: { asset: TAsset }) =>
      useVaultActionStore.getState().changeDepositAsset(e),
    changeWithdrawAsset: (e: { asset: TAsset }) =>
      useVaultActionStore.getState().changeWithdrawAsset(e),
    setInitialSelectedWithdrawAsset: (e: { assets: TAsset[] }) =>
      useVaultActionStore.getState().setInitialSelectedWithdrawAsset(e),
    changeMode: (e: { mode: TMode }) =>
      useVaultActionStore.getState().changeMode(e),
    updateDepositAmount: (e: { amount: string }) =>
      useVaultActionStore.getState().updateDepositAmount(e),
    updateWithdrawAmount: (e: { amount: string }) =>
      useVaultActionStore.getState().updateWithdrawAmount(e),
  },
  get: () => ({ context: useVaultActionStore.getState() }),
};

export const vaultActionStore = {
  store,
  selectors: {
    useIsSimulateModalOpen,
    useMode,
    useSelectedDepositAsset,
    useDepositAmount,
    useDepositSlippagePercent,
    useSelectedWithdrawAsset,
    useWithdrawSlippagePercent,
    useWithdrawAmount,
    useIsDepositWalletModalOpen,
    useIsRedeemWalletModalOpen,
  },
};
