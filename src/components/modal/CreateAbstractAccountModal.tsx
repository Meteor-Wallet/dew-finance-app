import closeIcon from "../../assets/close.svg";
import Modal from "react-modal";
import { memo } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWalletStore } from "../../stores/wallet_store";
import type { ChainName } from "../../stores/wallet_store";
import { CHAIN_META } from "../utils/ChainSelect";
import { dewFactoryUtils } from "../../utils/dewFactoryUtils";
import { useWalletSelector } from "../../walletSelector";
import { CircularProgress } from "../utils/CircularProgress";

const CreateAbstractAccountModal = memo(() => {
  const pending = useWalletStore((s) => s.pendingAbstractAccountCreation);
  const setPending = useWalletStore((s) => s.setPendingAbstractAccountCreation);
  const { signMessage } = useWalletSelector();

  const chainMeta = pending?.chain ? CHAIN_META[pending.chain] : null;

  const createAccountMutation = useMutation({
    mutationFn: async ({ address, chain }: { address: string; chain: ChainName }) => {
      await dewFactoryUtils.createAbstractAccount({
        blockchainAddress: address,
        chain,
        signMessage: (msg) => signMessage(chain, msg),
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const result = await dewFactoryUtils.checkAccountExists({ address, chain });
      if (!result.accountExists) throw new Error("Account was not created successfully");
      return result.nearAddress;
    },
    onSuccess: (nearAddress) => {
      useWalletStore.getState().setCurrentNearAccountId({ nearAccountId: nearAddress });
      setPending(null);
    },
    onError: (error) => {
      toast.error("Failed to create account", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleClose = () => {
    if (createAccountMutation.isPending) return;
    setPending(null);
  };

  return (
    <Modal
      isOpen={!!pending}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={!createAccountMutation.isPending}
      closeTimeoutMS={300}
      className={`
        absolute z-30
        bottom-0 md:-translate-x-1/2
        w-full max-w-full
        bg-[linear-gradient(139deg,#000000,#0C0C0C)] md:border-t md:border-card-border shadow-xl
        rounded-t-2xl
        transition-all duration-300
        animate-drawer-slide-up
        md:top-1/2 md:bottom-auto md:left-1/2 md:-translate-y-1/2 md:w-[500px]
        md:rounded-2xl md:border md:animate-none
      `}
      overlayClassName={`
        fixed inset-0 z-20 bg-black/40 backdrop-blur-md
        flex items-end md:items-center justify-center
      `}
    >
      <div className="w-full md:w-[500px] p-6 bg-[linear-gradient(139deg,#000000,#0C0C0C)] border-t border-t-modal-border md:border md:border-modal-border rounded-t-2xl md:rounded-2xl">
        <h2 className="text-2xl font-semibold mt-4 mb-2">Create Abstract Account</h2>
        <p className="text-gray text-sm mb-6">
          A NEAR abstract account is required to interact with vaults from your{" "}
          {chainMeta?.label ?? pending?.chain} wallet. Create one to continue.
        </p>

        <hr className="border-t border-border-color mb-6" />

        <div className="bg-card-background rounded-sm p-4 px-5 space-y-3 mb-6 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray">Chain</span>
            <div className="flex items-center gap-2">
              {chainMeta?.logo && (
                <img src={chainMeta.logo} alt={chainMeta.label} className="w-4 h-4" />
              )}
              <span>{chainMeta?.label ?? pending?.chain}</span>
            </div>
          </div>
          <div className="flex justify-between items-start gap-4">
            <span className="text-gray shrink-0">Wallet</span>
            <span className="text-right break-all text-xs font-mono">{pending?.address}</span>
          </div>
        </div>

        <button
          onClick={() => {
            if (pending) {
              createAccountMutation.mutate({ address: pending.address, chain: pending.chain });
            }
          }}
          disabled={createAccountMutation.isPending}
          className="flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black py-3 rounded-sm font-bold text-base confirm-button-shadow mb-3 disabled:opacity-60"
        >
          {createAccountMutation.isPending ? (
            <CircularProgress size="small" />
          ) : (
            "Create Account"
          )}
        </button>
        <button
          onClick={handleClose}
          disabled={createAccountMutation.isPending}
          className="flex justify-center items-center w-full bg-secondary text-white py-3 rounded-sm font-normal text-base disabled:opacity-40"
        >
          Maybe later
        </button>

        <button
          onClick={handleClose}
          disabled={createAccountMutation.isPending}
          className="modal-close-btn absolute bg-card-secondary-color top-[0px] right-[15px] md:-top-[30px] md:-right-[15px] w-[30px] h-[30px] md:w-[40px] md:h-[40px] flex justify-center items-center transition-all duration-300 rounded-full mt-4"
        >
          <img className="w-[10px] md:w-[13px]" src={closeIcon} alt="Close" />
        </button>
      </div>
    </Modal>
  );
});

export default CreateAbstractAccountModal;
