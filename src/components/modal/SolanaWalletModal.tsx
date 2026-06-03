import closeIcon from "../../assets/close.svg";
import Modal from "react-modal";
import Motion from "../utils/Motion";
import { memo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletStore } from "../../stores/wallet_store";
import { useWalletSelector } from "../../walletSelector";

const SolanaWalletModal = () => {
  const { wallets } = useWallet();
  const { signIn } = useWalletSelector();
  const isOpen = useWalletStore((s) => s.isSolanaWalletModalOpen);

  const handleClose = () => useWalletStore.getState().closeSolanaWalletModal();

  const handleWalletClick = (walletName: string) => {
    handleClose();
    signIn("sol", { walletName });
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick
      closeTimeoutMS={300}
      className={`
        absolute z-30
        bottom-0 md:-translate-x-1/2
        w-full max-w-full
        bg-[linear-gradient(139deg,#000000,#0C0C0C)] md:border-t md:border-card-border shadow-xl
        rounded-t-2xl
        transition-all duration-300
        animate-drawer-slide-up
        md:top-1/2 md:bottom-auto md:left-1/2 md:-translate-y-1/2 md:w-[380px]
        md:rounded-2xl md:border md:animate-none
      `}
      overlayClassName={`
        fixed inset-0 z-20 bg-black/40 backdrop-blur-md
        flex items-end md:items-center justify-center
      `}
    >
      <div className="w-full md:w-[380px] p-6 bg-[linear-gradient(139deg,#000000,#0C0C0C)] border-t border-t-modal-border md:border md:border-modal-border rounded-t-2xl md:rounded-2xl">
        <h2 className="text-2xl font-semibold mb-0 mt-4">Connect Solana</h2>
        <p className="text-sm text-gray font-regular mb-4">
          Choose a Solana wallet to connect.
        </p>
        <ul className="mb-8">
          {wallets.map((wallet, i) => (
            <Motion
              key={wallet.adapter.name}
              direction="left"
              duration={0.4}
              delay={0.3 + i * 0.05}
            >
              <li
                className="connect-wallet-list-items"
                onClick={() => handleWalletClick(wallet.adapter.name)}
              >
                <div className="list-logo">
                  <img src={wallet.adapter.icon} alt={wallet.adapter.name} />
                </div>
                {wallet.adapter.name}
              </li>
            </Motion>
          ))}
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

export default memo(SolanaWalletModal);
