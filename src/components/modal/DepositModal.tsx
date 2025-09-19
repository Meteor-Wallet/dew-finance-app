import closeIcon from "../../assets/close.svg";
import Sol from "../../assets/solana.svg";
import Eth from "../../assets/eth-full.svg";
import Btc from "../../assets/btc.png";
import Near from "../../assets/near.png";
import Modal from "react-modal";
import { memo } from "react";
import { walletStore } from "../../stores/wallet_store";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";


const tokens = [
  { symbol: "NEAR", icon: Near },
  { symbol: "ETH", icon: Sol },
  { symbol: "USDC", icon: Eth },
  { symbol: "BTC", icon: Btc },
];

const DepositModal = () => {
  const isDepositWalletModalOpen =
    walletStore.selectors.useIsDepositWalletModalOpen();

  const handleClose = () => {
    walletStore.store.trigger.closeDepositWalletModal();
  };

  const [selected, setSelected] = useState(tokens[0]);
  const [open, setOpen] = useState(false);

  return (
    <Modal
      isOpen={isDepositWalletModalOpen}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick
      closeTimeoutMS={300}
      className={`
        absolute z-30 
        bottom-0  md:-translate-x-1/2 
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
        <h2 className="text-2xl font-semibold mb-0 mt-4">Deposit Into Vault Name</h2>
        <hr className="border-t border-border-color mt-6 mb-6" />

        <div className="flex  justify-between items-center mt-5  mb-1.5">
          <p className="text-sm font-base text-white">Amount </p>
          <p className="text-sm font-base text-gray">
            Available: 0.0003
          </p>
        </div>

        <div className="relative  md:max-w-md mt-1">
          <input
            type="text"
            placeholder="0.0"
            className="w-full pl-28 pr-16 py-3 rounded-sm bg-input-background text-white placeholder-gray-500 text-base outline-hidden focus:ring-2 focus:ring-input-focus focus:border-input-focus transition"
          />
          <div
            id="dropdown"
            onClick={() => setOpen(!open)}
            className="absolute top-0 h-full flex items-center gap-2 bg-input-inner-background px-4 py-1 select-none cursor-pointer rounded-l-sm min-w-[95px]"
          >
            <img src={selected.icon} alt={selected.symbol} className="w-6 h-6" />
            <span className="text-sm text-white font-semibold">{selected.symbol}</span>
          </div>
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-input-inner-background text-white text-xs px-3 py-1.5 rounded-sm cursor-pointer transition-opacity duration-200 hover:opacity-50"
          >
            Max
          </div>
          {open && (
            <div className="absolute left-0 top-full mt-1 w-40 bg-input-inner-background rounded-md shadow-lg z-10">
              {tokens.map((token) => (
                <div
                  key={token.symbol}
                  onClick={() => {
                    setSelected(token);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-input-focus"
                >
                  <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
                  <span className="text-sm text-white">{token.symbol}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-sm mb-2 mt-5">Transaction Details </p>
        <div className="bg-card-background rounded-sm p-4 px-5 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray">Share</span>
            <div className="flex gap-1.5 items-center justify-center">
              <span>1 NEAR</span>{" "}
              <img src={Near} alt={"NEAR"} className="w-5 h-5" />
              <ArrowLeftRight className="text-gray" size={12} />
              <span>1 NEAR</span>{" "}
              <img src={Near} alt={"NEAR"} className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray">Slippage Tolerance</span>
            <span>12%</span>
          </div>
        </div>
        <button className="w-full mt-10 bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-bold text-base confirm-button-shadow relative px-6 mt-4 mb-4">
          Deposit
        </button>
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

export default memo(DepositModal);
