import closeIcon from "../../assets/close.svg";
import ethLogo from "../../assets/eth.svg";
import arbLogo from "../../assets/arb.png";
import solanaLogo from "../../assets/solana.svg";
import Motion from "../utils/Motion";
import Modal from "react-modal";
import { memo } from "react";
import { useWalletStore } from "../../stores/wallet_store";

const NetworkModal = () => {
  const isSwitchNetworkModalOpen = useWalletStore(
    (s) => s.isSwitchNetworkModalOpen
  );

  const handleClose = () =>
    useWalletStore.getState().closeSwitchNetworkModal();

  return (
    <Modal
      isOpen={isSwitchNetworkModalOpen}
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
        md:top-1/2 md:bottom-auto md:left-1/2 md:-translate-y-1/2 md:w-[420px]
        md:rounded-2xl md:border md:animate-none
    `}
      overlayClassName={`
        fixed inset-0 z-20 bg-black/40 backdrop-blur-md
        flex items-end md:items-center justify-center
    `}
    >
      <div className="w-full md:w-[420px] p-6  bg-[linear-gradient(139deg,#000000,#0C0C0C)] border-t border-t-modal-border md:border md:border-modal-border rounded-t-2xl md:rounded-2xl">
        <h2 className="text-2xl font-semibold mb-0 mt-4">Switch Networks</h2>
        <p className="text-sm text-gray font-regular mb-4">
          Switch to a supported blockchain network to access and manage your
          vault
        </p>
        <ul className="max-h-[70vh] space-y-4 pb-4">
          <Motion direction="left" duration={0.4} delay={0.1}>
            <li
              className="connect-wallet-list-items"
              onClick={() =>
                useWalletStore.getState().closeSwitchNetworkModal()
              }
            >
              <div className="list-logo near-logo">
                <img src={ethLogo} />
              </div>
              EVM
            </li>
            <li
              className="connect-wallet-list-items"
              onClick={() =>
                useWalletStore.getState().closeSwitchNetworkModal()
              }
            >
              <div className="list-logo near-logo">
                <img src={arbLogo} />
              </div>
              Arbitrum
            </li>
            <li
              className="connect-wallet-list-items"
              onClick={() =>
                useWalletStore.getState().closeSwitchNetworkModal()
              }
            >
              <div className="list-logo near-logo">
                <img src={solanaLogo} />
              </div>
              Solana
            </li>
          </Motion>
        </ul>
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

export default memo(NetworkModal);
