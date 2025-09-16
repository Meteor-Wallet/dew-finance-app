import closeIcon from "../../assets/close.svg";
import nearLogo from "../../assets/near.png";
import { simulateModalAtom } from "./simulateModalAtom";
import { useAtom } from "jotai";
import Modal from "react-modal";
import { memo, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

const SimulateModal = () => {
  const [simulateModal, setsimulateModal] = useAtom(simulateModalAtom);
  const [currentStep, setCurrentStep] = useState(0);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleClose = () => {
    setsimulateModal({ open: false });
    setCurrentStep(0);
  };

  useEffect(() => {
    if (simulateModal.open) {
       setCurrentStep(1);
      let step = 1;
      const interval = setInterval(() => {
        step++;
        setCurrentStep(step);
        if (step === items.length) clearInterval(interval); // stop after last item
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [simulateModal.open]);

  useEffect(() => {
    const ref = boxRefs.current[currentStep - 1];
    if (currentStep > 0 && ref) {
      ref.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentStep]);

  const items = [
    { title: "Ethereum", actions: 1 },
    { title: "Bitcoin", actions: 1 },
    { title: "Near", actions: 1 },
    { title: "Solana", actions: 1 },
  ];

  return (
    <Modal
      isOpen={simulateModal.open}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick
      closeTimeoutMS={300}
      className={`
        absolute z-30 bottom-0 md:-translate-x-1/2 
        w-full max-w-full
        bg-[linear-gradient(139deg,#000000,#0C0C0C)] md:border-t md:border-card-border shadow-xl
        rounded-t-2xl transition-all duration-300 animate-drawer-slide-up 
        md:top-1/2 md:bottom-auto md:left-1/2 md:-translate-y-1/2 md:w-[600px] 
        md:rounded-2xl md:border md:animate-none
      `}
      overlayClassName={`
        fixed inset-0 z-20 bg-black/40 backdrop-blur-md
        flex items-end md:items-center justify-center
      `}
    >
      <div className="w-full md:w-[600px] p-6 border-t border-t-modal-border md:border md:border-modal-border rounded-t-2xl md:rounded-2xl">
        <h2 className="text-2xl font-semibold mb-0 mt-4">Simulate Strategy Flow</h2>
        <p className="text-sm text-gray font-regular mb-4">
          Run a test of the vault’s investment strategy to preview expected returns, risks, and fund movements without committing real assets.
        </p>

        <div className="dot-grid w-full h-[60vh] overflow-y-auto no-scrollbar p-8 flex flex-col gap-8 items-center">
          {items.slice(0, currentStep).map((item, index) => (
            <div
              key={index}
              ref={(el) => { boxRefs.current[index] = el; }}
              className="flex flex-col items-center w-full"
            >
              {/* Item Box */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-input-background p-4 rounded-lg max-w-[400px] w-full"
              >
                <div className="flex justify-between mb-2 text-xs text-gray mb-3">
                  <div className='flex gap-1.5 items-center'><img src={nearLogo} className='w-5'/>{item.title}</div>
                  <p>{item.actions} Actions</p>
                </div>

                <div className="bg-card-background p-3 rounded">
                  <div className="flex justify-between text-sm">
                    <div>Swap</div>
                    <p>Pendle</p>
                  </div>
                  <hr className="my-4 border-t border-border-color" />
                  <div className="flex justify-between text-sm">
                    <div className='text-gray'>49,999.50</div>
                    <div className='flex gap-1.5 items-center'><img src={nearLogo} className='w-5'/>USDC</div>
                  </div>
                  <hr className="my-4 border-t border-border-color" />
                  <div className="flex justify-between text-sm">
                    <div className='text-gray'>49,999.50</div>
                    <div className='flex gap-1.5 items-center'><img src={nearLogo} className='w-5'/>USDC</div>
                  </div>
                </div>
              </motion.div>

              {/* Arrow pointing to next item */}
              {index < currentStep - 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-3 text-primary"
                >
                  <ArrowDown size={28} />
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="modal-close-btn absolute bg-card-secondary-color top-[0px] right-[15px] md:-top-[30px] md:-right-[15px] w-[30px] h-[30px] md:w-[40px] md:h-[40px] flex justify-center items-center transition-all duration-300 rounded-full mt-4 text-xs underline"
        >
          <img className="w-[10px] md:w-[13px]" src={closeIcon} alt="Close" />
        </button>
      </div>
    </Modal>
  );
};

export default memo(SimulateModal);
