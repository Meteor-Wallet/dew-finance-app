import { atom } from "jotai";

export const onboardingModalAtom = atom<{
  open: boolean;
}>({
  open: false,
});
