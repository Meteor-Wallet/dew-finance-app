import { create } from "zustand";
import type { TAsset } from "../queries/vault";

export type TMode = "deposit" | "withdraw";

export interface VaultActionState {
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

export const useVaultActionStore = create<VaultActionState>()((set) => ({
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
    set(
      mode === "deposit"
        ? { mode, depositAmount: "" }
        : { mode, withdrawAmount: "" }
    ),

  updateDepositAmount: ({ amount }) => {
    if (!isNaN(Number(amount))) set({ depositAmount: amount });
  },

  updateWithdrawAmount: ({ amount }) => {
    if (!isNaN(Number(amount))) set({ withdrawAmount: amount });
  },
}));
