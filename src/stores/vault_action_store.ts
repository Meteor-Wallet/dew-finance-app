import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { produce } from "immer";

const store = createStore({
  context: {
    isSimulateModalOpen: false,
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
  },
});

const useIsSimulateModalOpen = () => {
  return useSelector(store, ({ context }) => context.isSimulateModalOpen);
};

export const vaultActionStore = {
  store,
  selectors: {
    useIsSimulateModalOpen,
  },
};
