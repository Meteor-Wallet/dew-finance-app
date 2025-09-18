import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { produce } from "immer";
import type { TAsset } from "../queries/vault";

export type TMode = "deposit" | "withdraw";

const store = createStore({
  context: {
    isSimulateModalOpen: false,
    mode: "deposit",
    selectedDepositAsset: null,
    depositAmount: "",
    slippagePercent: "1",
  } as {
    isSimulateModalOpen: boolean;
    mode: TMode;
    selectedDepositAsset: TAsset | null;
    depositAmount: string;
    slippagePercent: string;
  },
  on: {
    openSimulateModal: (context) =>
      produce(context, (draft) => {
        draft.isSimulateModalOpen = true;
      }),
    closeSimulateModal: (context) =>
      produce(context, (draft) => {
        draft.isSimulateModalOpen = false;
      }),
    setInitialSelectedToken: (
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
    changeMode: (context, event: { mode: TMode }) =>
      produce(context, (draft) => {
        draft.mode = event.mode;
        draft.depositAmount = "";
      }),
    updateAmount: (context, event: { amount: string }) =>
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
  },
});

const useIsSimulateModalOpen = () => {
  return useSelector(store, ({ context }) => context.isSimulateModalOpen);
};

const useMode = () => {
  return useSelector(store, ({ context }) => context.mode);
};

const useSelectedDepositAsset = () => {
  return useSelector(store, ({ context }) => context.selectedDepositAsset);
};

const useDepositAmount = () => {
  return useSelector(store, ({ context }) => context.depositAmount);
};

const useSlippagePercent = () => {
  return useSelector(store, ({ context }) => context.slippagePercent);
};

export const vaultActionStore = {
  store,
  selectors: {
    useIsSimulateModalOpen,
    useMode,
    useSelectedDepositAsset,
    useDepositAmount,
    useSlippagePercent,
  },
};
