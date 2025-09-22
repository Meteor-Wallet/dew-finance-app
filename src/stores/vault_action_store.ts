import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { produce } from "immer";
import type { TAsset } from "../queries/vault";

export type TMode = "deposit" | "withdraw";

const store = createStore({
  context: {
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
  } as {
    isDepositWalletModalOpen: boolean;
    isRedeemWalletModalOpen: boolean;
    isSimulateModalOpen: boolean;
    mode: TMode;
    selectedDepositAsset: TAsset | null;
    depositAmount: string;
    depositSlippagePercent: string;
    withdrawSlippagePercent: string;
    withdrawAmount: string;
    selectedWithdrawAsset: TAsset | null;
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
    openSimulateModal: (context) =>
      produce(context, (draft) => {
        draft.isSimulateModalOpen = true;
      }),
    closeSimulateModal: (context) =>
      produce(context, (draft) => {
        draft.isSimulateModalOpen = false;
      }),
    setInitialSelectedDepositAsset: (
      context,
      event: {
        assets: TAsset[];
      }
    ) =>
      produce(context, (draft) => {
        if (event.assets.length > 0) {
          draft.selectedDepositAsset = event.assets[0];
        } else {
          draft.selectedDepositAsset = null;
        }
      }),
    changeDepositAsset: (context, event: {asset: TAsset}) => produce(context, draft => {
      draft.selectedDepositAsset = event.asset
    }),
    changeWithdrawAsset: (context, event: {asset: TAsset}) => produce(context, draft => {
      draft.selectedWithdrawAsset = event.asset
    }),
    setInitialSelectedWithdrawAsset: (
      context,
      event: {
        assets: TAsset[];
      }
    ) =>
      produce(context, (draft) => {
        if (event.assets.length > 0) {
          draft.selectedWithdrawAsset = event.assets[0];
        } else {
          draft.selectedWithdrawAsset = null;
        }
      }),
    changeMode: (context, event: { mode: TMode }) =>
      produce(context, (draft) => {
        draft.mode = event.mode;
        if (event.mode === "deposit") {
          draft.depositAmount = "";
        } else {
          draft.withdrawAmount = "";
        }
      }),
    updateDepositAmount: (context, event: { amount: string }) =>
      produce(context, (draft) => {
        try {
          const number = Number(event.amount);
          if (isNaN(number)) {
            throw new Error("Input is not a number");
          }
          draft.depositAmount = event.amount;
        } catch (err) {
          // ignore if fail
        }
      }),
    updateWithdrawAmount: (context, event: { amount: string }) =>
      produce(context, (draft) => {
        try {
          const number = Number(event.amount);
          if (isNaN(number)) {
            throw new Error("Input is not a number");
          }
          draft.withdrawAmount = event.amount;
        } catch (err) {
          // ignore if fail
        }
      }),
  },
});

const useIsRedeemWalletModalOpen = () => {
  return useSelector(store, ({ context }) => context.isRedeemWalletModalOpen);
};

const useIsDepositWalletModalOpen = () => {
  return useSelector(store, ({ context }) => context.isDepositWalletModalOpen);
};

const useIsSimulateModalOpen = () => {
  return useSelector(store, ({ context }) => context.isSimulateModalOpen);
};

const useMode = () => {
  return useSelector(store, ({ context }) => context.mode);
};

const useSelectedDepositAsset = () => {
  return useSelector(store, ({ context }) => context.selectedDepositAsset);
};

const useSelectedWithdrawAsset = () => {
  return useSelector(store, ({ context }) => context.selectedWithdrawAsset);
};

const useDepositAmount = () => {
  return useSelector(store, ({ context }) => context.depositAmount);
};

const useWithdrawAmount = () => {
  return useSelector(store, ({ context }) => context.withdrawAmount);
};

const useDepositSlippagePercent = () => {
  return useSelector(store, ({ context }) => context.depositSlippagePercent);
};

const useWithdrawSlippagePercent = () => {
  return useSelector(store, ({ context }) => context.withdrawSlippagePercent);
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
