import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { produce } from "immer";
import type { TAsset } from "../queries/vault";

export type TMode = "deposit" | "withdraw";

const store = createStore({
  context: {
    isSimulateModalOpen: false,
    mode: "deposit",
    selectedAsset: null,
    amount: "",
  } as {
    isSimulateModalOpen: boolean;
    mode: TMode;
    selectedAsset: TAsset | null;
    amount: string;
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
          draft.selectedAsset = event.assets[0];
        }
      }),
    changeMode: (context, event: { mode: TMode }) =>
      produce(context, (draft) => {
        draft.mode = event.mode;
        draft.amount = "";
      }),
    updateAmount: (context, event: { amount: string }) =>
      produce(context, (draft) => {
        try {
          const number = Number(event.amount);
          if (isNaN(number)) {
            throw new Error("Input is not a number");
          }
          draft.amount = event.amount;
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

const useSelectedAsset = () => {
  return useSelector(store, ({ context }) => context.selectedAsset);
};

const useAmount = () => {
  return useSelector(store, ({ context }) => context.amount);
};

export const vaultActionStore = {
  store,
  selectors: {
    useIsSimulateModalOpen,
    useMode,
    useSelectedAsset,
    useAmount,
  },
};
