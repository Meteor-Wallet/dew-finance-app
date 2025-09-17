import { useMutation } from "@tanstack/react-query";
import { walletStore } from "../stores/wallet_store";
import { dewFactoryUtils } from "../utils/dewFactoryUtils";
import { useWalletSelector } from "../walletSelector";
import { DewAccountBackend } from "../backend/DewAccountBackend";
import { nearUtils } from "../utils/nearUtils";
import { toast } from "sonner";

const useAuthorizeWalletMutation = () => {
  const connectedWallet = walletStore.selectors.useConnectedWalletAddress();

  const { signMessage } = useWalletSelector();

  return useMutation({
    mutationFn: async () => {
      if (connectedWallet) {
        const { message, blockchainId, deadline, nearAddress } =
          dewFactoryUtils.getMessageForCreateAccount({
            chain: walletStore.store.get().context.selectedChain,
            blockchainAddress: connectedWallet.address,
          });
        const signature = await signMessage(message);

        await DewAccountBackend.createDewAccount({
          blockchain_address: connectedWallet.address,
          blockchain_id: blockchainId,
          deadline,
          signature: signature,
        });

        const accountExists = await nearUtils.provider
          .viewAccount(nearAddress)
          .then(() => true)
          .catch(() => false);

        if (accountExists) {
          walletStore.store.trigger.closeOnboardModal();
        }
      }
    },
    onError: (error) => {
      toast.error("Something went wrong", {
        description: error.message,
      });
    },
  });
};

export const dewFactoryMutations = {
  useAuthorizeWalletMutation,
};
