import { useMutation } from "@tanstack/react-query";
import { walletStore } from "../stores/wallet_store";
import { dewFactoryUtils } from "../utils/dewFactoryUtils";
import { useWalletSelector } from "../walletSelector";
import { DewAccountBackend } from "../backend/DewAccountBackend";
import { nearUtils } from "../utils/nearUtils";
import { toast } from "sonner";
import { useRef } from "react";

const useAuthorizeWalletMutation = () => {
  const connectedWallet = walletStore.selectors.useConnectedWalletAddress();

  const { signMessage } = useWalletSelector();

  const toastIdRef = useRef<number | string>(undefined);

  return useMutation({
    mutationFn: async () => {
      if (connectedWallet) {
        toastIdRef.current = toast.loading("Authorizing", {
          description: "Generating message to sign for authorizing account",
        });
        const { message, blockchainId, deadline, nearAddress } =
          await dewFactoryUtils.getMessageForCreateAccount({
            chain: walletStore.store.get().context.selectedChain,
            blockchainAddress: connectedWallet.address,
          });

        toast.loading("Authorizing", {
          description: "Request wallet selector to sign message",
          id: toastIdRef.current
        });
        const signature = await signMessage(message);

        toast.loading("Authorizing", {
          description: "Creating your abstracted account",
          id: toastIdRef.current
        });
        await DewAccountBackend.createDewAccount({
          blockchain_address: connectedWallet.address,
          blockchain_id: blockchainId,
          deadline,
          signature: signature,
        });

        toast.loading("Authorizing", {
          description: "Making sure the abstracted account is created",
          id: toastIdRef.current
        });
        const accountExists = await nearUtils.provider
          .viewAccount(nearAddress)
          .then(() => true)
          .catch(() => false);

        if (accountExists) {
          toast.success("Authorizing", {
            description: "Abstracted account authorized successfully",
            id: toastIdRef.current
          });
          walletStore.store.trigger.setCurrentNearAccountId({
            nearAccountId: nearAddress,
          });
          walletStore.store.trigger.closeOnboardModal();
        }else{
          throw new Error("Fail to create abstracted account")
        }
      }
    },
    onError: (error) => {
      toast.error("Something went wrong", {
        description: error.message,
        id: toastIdRef.current
      });
    },
  });
};

export const dewFactoryMutations = {
  useAuthorizeWalletMutation,
};
