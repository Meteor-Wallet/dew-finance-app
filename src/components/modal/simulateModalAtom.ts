import { atom } from "jotai";

export const simulateModalAtom = atom<{
  open: boolean;
}>({
  open: false,
});
