import { atom } from "jotai";

export const networkModalAtom = atom<{
  open: boolean;
}>({
  open: false,
});
