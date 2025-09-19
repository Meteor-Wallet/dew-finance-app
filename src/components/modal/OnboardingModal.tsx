import Modal from "react-modal";
import { AnimatePresence, motion } from "framer-motion";
import { useRive } from "@rive-app/react-canvas";
import DotGrid from "../utils/DotGrid";
import { walletStore } from "../../stores/wallet_store";
import _ from "lodash";
import { useWalletSelector } from "../../walletSelector";
import { dewFactoryMutations } from "../../mutations/dewFactory";
import { CircularProgress } from "../utils/CircularProgress";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

export default function OnboardingModal() {
  const { RiveComponent } = useRive({
    src: "/rive/dew_hand.riv",
    autoplay: true,
    stateMachines: "State Machine 1",
  });

  const isOnboardModalOpen = walletStore.selectors.useIsOnboardModalOpen();

  const { signOut } = useWalletSelector();

  const authorizeWalletMutation =
    dewFactoryMutations.useAuthorizeWalletMutation();

  const isPending = authorizeWalletMutation.isPending;

  return (
    <Modal
      isOpen={isOnboardModalOpen}
      shouldCloseOnOverlayClick={false}
      closeTimeoutMS={600}
      className="absolute w-screen md:h-auto h-screen md:w-[90vw] max-w-3xl shadow-xl bg-[linear-gradient(139deg,#000000,#0C0C0C)] text-white md:border md:border-modal-border md:rounded-2xl p-4 md:p-8 transition-all duration-600 flex flex-col md:justify-center justify-between outline-none"
      overlayClassName="fixed inset-0 z-20 bg-black/50 backdrop-blur-md flex justify-center items-center"
    >
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="w-full flex justify-end bg-[linear-gradient(139deg,#13141A,#191b23)] h-[50vh] md:h-[300px] rounded-xl mb-6 items-end relatve">
            <div className="h-[250px] md:h-[280px] w-full relative overflow-hidden">
              <DotGrid
                dotSize={3}
                gap={30}
                baseColor="#2c333da7"
                proximity={0}
              />
              <div className="absolute top-0 left-0 w-full h-full z-3">
                <RiveComponent />
              </div>
              <div className="absolute bottom-[-100px] left-0 right-0 mx-auto w-[250px] h-[250px] bg-[linear-gradient(139deg,#3DA9EA,#abdfff)] rounded-full opacity-70 blur-[60px] z-0"></div>
            </div>
          </div>

          <div className=" mb-8 ">
            <h2 className="text-xl font-bold text-white mb-1">
              Welcome to Dew Finance
            </h2>
            <p className="text-gray text-base md:text-sm leading-relaxed">
              Manage your digital assets with secure vaults, flexible policies,
              and seamless cross-chain access.Easily grow, protect, and control
              your crypto—all in one place.Connect your wallet, explore vaults,
              and take control of your decentralized finance experience.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-end items-center w-full mt-4">
        <div className="flex  gap-4">
          <button
            onClick={() => {
              if (isPending) {
                return;
              }
              signOut();
              walletStore.store.trigger.closeOnboardModal();
            }}
            className="text-gray hover:text-white text-base"
          >
            Cancel
          </button>
          <button
            className={twMerge([
              "flex justify-center items-center",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              clsx({
                "cursor-progress disabled:cursor-progress": isPending,
              }),
              "text-base bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] confirm-button-shadow relative ml-2 text-black px-5 py-3 rounded-lg font-bold hover:opacity-[0.5] transition-all duration-200",
            ])}
            onClick={async () => {
              if (!isPending) {
                authorizeWalletMutation.mutate();
              }
            }}
            disabled={isPending}
          >
            {isPending ? (
              <div className="mr-1">
                <CircularProgress size="small" />
              </div>
            ) : (
              "Authorize Wallet"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
