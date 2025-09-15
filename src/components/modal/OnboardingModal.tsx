import Modal from "react-modal";
import { useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";
import { connectWalletModalAtom } from "./connectWalletModalAtom";
import { onboardingModalAtom } from "./onboardingModalAtom";
import { AnimatePresence, motion } from "framer-motion";

export default function OnboardingModal() {
  const [onboardingModal, setOnboardingModal] = useAtom(onboardingModalAtom);

  useEffect(() => {
    if (!onboardingModal.open) {
    }
  }, [onboardingModal.open]);

  const setConnectWalletModal = useSetAtom(connectWalletModalAtom);
  const handleClose = () => {
    setOnboardingModal({ open: false });
  };

  return (
    <Modal
      isOpen={onboardingModal.open}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick
      closeTimeoutMS={600}
      className="absolute w-screen md:h-auto h-screen md:w-[90vw] max-w-3xl shadow-xl bg-[linear-gradient(139deg,#000000,#0C0C0C)] text-white md:border md:border-modal-border md:rounded-2xl p-4 md:p-8 transition-all duration-600 flex flex-col md:justify-center justify-between outline-none"
      overlayClassName="fixed inset-0 z-20 bg-black/50 backdrop-blur-md flex justify-center items-center"
    >
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="w-full flex justify-center bg-[linear-gradient(139deg,#13141A,#191b23)] h-[50vh] md:h-[300px] rounded-xl mb-6 items-center">
            <div className="h-[180px] md:h-[250px] w-full">
                <img src={''}/>
            </div>
          </div>

          <div className=" mb-8 ">
            <h2 className="text-2xl font-bold text-white">
              Title
            </h2>
            <p className="text-text-gray text-sm md:text-sm leading-relaxed">
              Descripion
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
       <div className="flex justify-between items-center w-full mt-4">
        <div className="flex  gap-4">
           <button
            onClick={handleClose}
            className="text-white/60 hover:text-white text-sm"
          >
            Cancel
          </button>
          <button
            className="text-base bg-[#DAFF00] ml-2 text-black px-5 py-2 rounded-lg font-bold hover:opacity-[0.5] transition-all duration-200"
            onClick={()=>{setConnectWalletModal({open:false, connected:true}); handleClose();}}
          >
            Authorize Wallet
          </button>
        </div>
      </div>
    </Modal>
  );
}
