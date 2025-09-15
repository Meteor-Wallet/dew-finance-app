import { useState, useEffect, useRef } from "react";
import { ChevronDown, Copy, LogOut, X, Menu } from "lucide-react";
import Motion from "../utils/Motion";
import Eth from "../../assets/eth-full.svg";
import Logo from "../../assets/logo.svg";
import { connectWalletModalAtom } from "../modal/connectWalletModalAtom";
import { toast } from "sonner";
import { useAtom } from "jotai";

export default function Navbar() {

    const [showDropdown, setShowDropdown] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [walletDrawerClosing, setWalletDrawerClosing] = useState(false);
    const [menuDrawerClosing, setMenuDrawerClosing] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [connectWalletModal, setConnectWalletModal] = useAtom(
    connectWalletModalAtom
  );

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

    return (
        <>
            <nav className="transition-transform duration-300  py-3 pt-5 flex justify-between items-center flex-wrap relative z-10">
                <Motion direction="left" duration={0.6} delay={0.6}>
                    <div className="text-white flex gap-3 text-[1.4rem] items-center">
                        <div className="relative">
                            <img className="w-[40px]" src={Logo} alt="logo" />
                        </div>
                        <span className="font-light hidden md:inline">Dew Finance</span>
                    </div>
                </Motion>

                <div className="flex gap-4 items-center justify-end relative">
                    <Motion direction="right" duration={1} delay={0.9} zIndex={1}>
                        {!connectWalletModal.connected ? (
                            <button
                                onClick={() => {
                                    setConnectWalletModal({ open: true });
                                }}
                                className="bg-primary text-black px-6 py-3 rounded-md font-bold primary-button-shadow text-base"
                            >
                                Connect Wallet
                            </button>
                        ) : (
                            <>
                                <div className="relative md:block" ref={dropdownRef}>
                                    <button
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        className="bg-card-background border border-card-border flex items-center gap-2 px-3 py-2 lg:px-5  rounded-md font-medium text-white text-base"
                                    >
                                        <div className="near-logo w-[22px] md:w-[25px] lg:w-[27px] h-[22px] md:h-[25px] lg:h-[27px] rounded-full flex items-center justify-center">
                                            <img
                                                className="w-full"
                                                src={Eth}
                                                alt="near-logo"
                                            />
                                        </div>
                                        0xa1...near
                                        <ChevronDown
                                            size={18}
                                            className={`transition-transform duration-300 ${showDropdown ? "rotate-180" : "rotate-0"
                                                }`}
                                        />
                                    </button>

                                    <div
                                        className={`absolute hidden md:block right-0 top-14 z-10000 w-[240px] bg-modal-background border border-card-border rounded-md shadow-md transform transition-all duration-200 ${showDropdown
                                            ? "scale-100 opacity-100 visible"
                                            : "scale-95 opacity-0 invisible"
                                            }`}
                                        style={{ boxShadow: "5px 15px 25px #020202" }}
                                    >
                                        <WalletDropdownContent  onClose={() => setShowDropdown(false)} setConnectWalletModal={setConnectWalletModal} />
                                    </div>
                                </div>
                            </>
                        )}
                    </Motion>
                    <button
                        className="md:hidden text-white text-xl"
                        onClick={() => setMenuOpen(true)}
                    >
                        <Menu />
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Drawer */}
            {menuOpen && (
                <>
                    <div
                        className={`rounded-b-lg fixed border-b pt-20 pb-20 border-b-[#3b3b46] center top-0 left-0 w-full h-auto bg-modal-background z-9999 p-5 transition-all duration-300 ${menuDrawerClosing ? "animate-slide-up" : "animate-slide-down"
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
                        <div className="flex flex-col gap-6">
                        </div>
                    </div>
                    <div
                        className={`
                            fixed z-9998 top-0 left-0 w-full h-full max-w-screen
                            bg-black/10 backdrop-blur-md
                            transition-all duration-300
                            ${walletDrawerClosing ? "animate-fade-out" : "animate-fade-in"}
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
                        className={`rounded-b-lg fixed border-b border-b-[#3b3b46] max-w-screen top-0 left-0 w-full h-auto bg-modal-background z-10000 transition-all duration-300 ${walletDrawerClosing ? "animate-slide-up" : "animate-slide-down"
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
                        <WalletDropdownContent  onClose={closeWalletDrawer} setConnectWalletModal={setConnectWalletModal}/>
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

function WalletDropdownContent({
    onClose,
    setConnectWalletModal
}: {
    onClose: () => void;
    setConnectWalletModal: (state: any) => void;
}) {
    return (
        <div className="text-white">
            <div className="bg-[linear-gradient(200deg,#252525,#121215)] pb-12 p-16 md:p-5 flex justify-center items-center flex-col">
                <Motion direction="top" duration={1}>
                    <div className="flex justify-center items-center flex-col">
                        <div className="near-logo w-[80px] h-[80px] md:w-[60px] md:h-[60px] rounded-full flex items-center justify-center md:mb-1 mb-2">
                            <img className="w-full" src={Eth} alt="near-logo" />
                        </div>
                        <p className="text-xl md:text-sm text-center font-semibold flex gap-1 items-center">
                            0xa1...near
                            <Copy
                                className="cursor-pointer"
                                onClick={() => {
                                    navigator.clipboard.writeText("0xa1...near");
                                    toast.success("Wallet Address copied!");
                                }}
                                size={12}
                            />
                        </p>
                        <p className="text-base md:text-xs text-center text-text-gray md:mt-0 mt-[-5px]">
                            Meteor Wallet
                        </p>
                    </div>
                </Motion>
            </div>
            <hr className="border-card-border" />
            <button
                onClick={() => {
                    navigator.clipboard.writeText("0xa1...near");
                    toast.success("Wallet Address copied!");
                }}
                className="flex items-center gap-2 w-full text-left px-4 py-4 md:py-3 hover:bg-card-border text-sm"
            >
                <Copy size={16} />
                Copy Wallet Address
            </button>
            <button
                onClick={() => {
                    onClose();
                    setConnectWalletModal({ open: false, connected: false });
                }}
                className="flex items-center gap-2 w-full text-left px-4 py-4 md:py-3 hover:bg-card-border text-sm"
            >
                <LogOut size={16} />
                Disconnect Wallet
            </button>
        </div>
    );
}
