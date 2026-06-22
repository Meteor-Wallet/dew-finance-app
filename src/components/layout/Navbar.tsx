import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, PieChart, Wallet, X } from "lucide-react";
import Motion from "../utils/Motion";
import { toast } from "sonner";
import { useRive } from "@rive-app/react-canvas";
import { useWalletStore } from "../../stores/wallet_store";
import { useWalletSelector } from "../../walletSelector";
import nearLogo from "../../assets/near.svg";
import solanaLogo from "../../assets/solana.svg";
import ethLogo from "../../assets/eth.svg";
import zecLogo from "../../assets/zec.svg";
import arbLogo from "../../assets/arb.png";
import baseLogo from "../../assets/base.png";
import bnbLogo from "../../assets/bnb.png";
import type { ChainName } from "../../stores/wallet_store";

export default function Navbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletDrawerClosing, setWalletDrawerClosing] = useState(false);
  const [menuDrawerClosing, setMenuDrawerClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const connectedWallets = useWalletStore((s) => s.connectedWallets);
  const isChainConnected = (chain: ChainName) =>
    connectedWallets.some((w) => w.supportedChains.includes(chain));

  const closeWalletDrawer = () => {
    setWalletDrawerClosing(true);
    setTimeout(() => {
      setShowDropdown(false);
      setWalletDrawerClosing(false);
    }, 300);
  };

  const closeMenuDrawer = () => {
    setMenuDrawerClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setMenuDrawerClosing(false);
    }, 300);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mediaQuery.matches &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { RiveComponent } = useRive({
    src: "/rive/dew_loader2.riv",
    autoplay: true,
  });

  return (
    <>
      <nav className="transition-transform duration-300  py-3 pt-5 flex justify-between items-center flex-wrap relative z-10">
        <Motion direction="left" duration={0.6}>
          <Link to="/" className="text-white flex gap-3 text-[1.4rem] items-center">
            <div className="relative">
              <div className="w-[30px] h-[30px] md:w-[40px] md:h-[40px]">
                <RiveComponent />
              </div>
            </div>
            <span className="font-medium hidden md:inline">Dew Finance</span>
          </Link>
        </Motion>

        <div className="flex gap-4 items-center justify-end relative">
          <Motion direction="right" duration={1} delay={0.6} zIndex={1}>
            <div className="flex items-center gap-3">
              {connectedWallets.length === 0 ? (
                <div className="relative md:block">
                  <button
                    onClick={() => useWalletStore.getState().openConnectWalletModal()}
                    className="bg-primary text-black px-3 py-3 md:px-6 md:py-3 rounded-md font-bold primary-button-shadow text-base"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="relative md:block" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="bg-card-background border border-card-border flex items-center gap-2.5 px-3 py-2 lg:px-4 rounded-md font-medium text-white text-base transform transition duration-300 hover:scale-98 hover:opacity-80"
                  >
                    <div className="flex items-center gap-1.5">
                      {DISPLAY_CHAINS.map((chain) =>
                        chain.key === "eth" ? (
                          <div
                            key={chain.key}
                            className="w-5 h-5 grid grid-cols-2 gap-px rounded overflow-hidden shrink-0"
                            style={{ filter: isChainConnected(chain.key) ? "none" : "grayscale(1) opacity(0.25)" }}
                          >
                            <div className="bg-[#627EEA] flex items-center justify-center p-px">
                              <img src={ethLogo} alt="ETH" className="w-full h-full object-contain" />
                            </div>
                            <div className="bg-[#213147] flex items-center justify-center p-px">
                              <img src={arbLogo} alt="ARB" className="w-full h-full object-contain" />
                            </div>
                            <div className="bg-[#0052FF] flex items-center justify-center p-px">
                              <img src={baseLogo} alt="Base" className="w-full h-full object-contain" />
                            </div>
                            <div className="bg-[#F3BA2F] flex items-center justify-center p-px">
                              <img src={bnbLogo} alt="BNB" className="w-full h-full object-contain" />
                            </div>
                          </div>
                        ) : (
                          <div
                            key={chain.key}
                            className={`w-5 h-5 rounded-full flex items-center justify-center ${chain.bgClass}`}
                            style={{ filter: isChainConnected(chain.key) ? "none" : "grayscale(1) opacity(0.25)" }}
                          >
                            <img className="w-full" src={chain.logo} alt={chain.label} />
                          </div>
                        )
                      )}
                    </div>
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-300 ${
                        showDropdown ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  <div
                    className={`absolute hidden md:block right-0 top-14 z-10000 w-[240px] bg-modal-background border border-card-border rounded-md shadow-md transform transition-all duration-200 z-1000 ${
                      showDropdown
                        ? "scale-100 opacity-100 visible"
                        : "scale-95 opacity-0 invisible"
                    }`}
                    style={{ boxShadow: "5px 15px 25px #020202" }}
                  >
                    <WalletDropdownContent
                      onClose={() => setShowDropdown(false)}
                    />
                  </div>
                </div>
              )}
            </div>
          </Motion>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <>
          <div
            className={`rounded-b-lg fixed border-b pt-20 pb-20 border-b-[#3b3b46] center top-0 left-0 w-full h-auto bg-modal-background z-9999 p-5 transition-all duration-300 ${
              menuDrawerClosing ? "animate-slide-up" : "animate-slide-down"
            } md:hidden`}
          >
            <div className="flex justify-center items-center text-center mb-6">
              <h2 className="text-white/10 text-2xl font-semibold">MENU</h2>
              <div
                onClick={closeMenuDrawer}
                className="absolute top-[15px] right-[20px] w-[35px] h-[35px] bg-[#343438] rounded-full flex items-center justify-center"
              >
                <button className="text-white text-xl">
                  <X className="w-[20px]" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-6"></div>
          </div>
          <div
            className={`
              fixed z-9998 top-0 left-0 w-full h-full max-w-screen
              bg-black/10 backdrop-blur-md
              transition-all duration-300
              ${menuDrawerClosing ? "animate-fade-out" : "animate-fade-in"}
              md:hidden
            `}
            onClick={closeMenuDrawer}
          ></div>
        </>
      )}

      {/* Mobile Wallet Drawer */}
      {showDropdown && (
        <>
          <div
            className={`rounded-b-lg fixed border-b border-b-[#3b3b46] max-w-screen top-0 left-0 w-full h-auto bg-modal-background z-10000 transition-all duration-300 ${
              walletDrawerClosing ? "animate-slide-up" : "animate-slide-down"
            } md:hidden`}
          >
            <div
              onClick={closeWalletDrawer}
              className="absolute top-[15px] right-[20px] w-[35px] h-[35px] bg-[#343438] rounded-full flex items-center justify-center"
            >
              <button className="text-white text-xl">
                <X className="w-[20px]" />
              </button>
            </div>
            <WalletDropdownContent onClose={closeWalletDrawer} />
          </div>
          <div
            className={`
              fixed z-9999 top-0 left-0 w-full h-full max-w-screen
              bg-black/10 backdrop-blur-md
              transition-all duration-300
              ${walletDrawerClosing ? "animate-fade-out" : "animate-fade-in"}
              md:hidden
            `}
            onClick={closeWalletDrawer}
          ></div>
        </>
      )}
    </>
  );
}

const DISPLAY_CHAINS: { key: ChainName; logo: string; label: string; bgClass: string }[] = [
  { key: "near",   logo: nearLogo,   label: "NEAR",     bgClass: "near-logo" },
  { key: "solana", logo: solanaLogo, label: "Solana",   bgClass: "solana-logo" },
  { key: "eth",    logo: ethLogo,    label: "EVM",      bgClass: "eth-logo" },
  { key: "zec",    logo: zecLogo,    label: "Zcash",    bgClass: "" },
];

function WalletDropdownContent({ onClose }: { onClose: () => void }) {
  const currentNearAccountId = useWalletStore((s) => s.nearAccountId);

  return (
    <div className="text-white">
      {currentNearAccountId && (
        <>
          <div className="px-4 py-3">
            <a
              href={`http://nearblocks.io/address/${currentNearAccountId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-xs text-blue-400 underline truncate cursor-pointer hover:text-blue-300"
            >
              {currentNearAccountId}
            </a>
          </div>
          <hr className="border-card-border" />
        </>
      )}
      <Link
        to="/portfolio"
        onClick={onClose}
        className="flex items-center gap-2 w-full text-left px-4 py-4 md:py-3 hover:bg-card-border text-sm"
      >
        <PieChart size={16} />
        My Portfolio
      </Link>
      <button
        onClick={() => {
          onClose();
          useWalletStore.getState().openConnectWalletModal();
        }}
        className="flex items-center gap-2 w-full text-left px-4 py-4 md:py-3 hover:bg-card-border text-sm"
      >
        <Wallet size={16} />
        Manage Wallets
      </button>
    </div>
  );
}
