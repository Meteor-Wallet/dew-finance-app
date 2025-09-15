import { atom } from "jotai";

export const connectWalletModalAtom = atom<{
  open: boolean;
  connected?: boolean;
}>({
  open: false,
  connected: false,
});
