import closeIcon from "../../assets/close.svg";
import nearLogo from "../../assets/near.svg";
import solanaLogo from "../../assets/solana.svg";
import ethLogo from "../../assets/eth.svg";
import zecLogo from "../../assets/zec.svg";
import arbLogo from "../../assets/arb.png";
import baseLogo from "../../assets/base.png";
import bnbLogo from "../../assets/bnb.png";
import Modal from "react-modal";
import Motion from "../utils/Motion";
import { memo, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWalletStore } from "../../stores/wallet_store";
import { useWalletSelector } from "../../walletSelector";
import { nearConnector } from "../../nearConnector";
import { stringUtils } from "../../utils/stringUtils";
import { dewAccountQueries } from "../../queries/dewAccount";
import { dewAccountUtils } from "../../utils/dewAccountUtils";
import { dewFactoryUtils } from "../../utils/dewFactoryUtils";
import { queryClient } from "../../queryClient";
import { CircularProgress } from "../utils/CircularProgress";

const EvmCombinedLogo = () => (
  <div className="w-10 h-10 grid grid-cols-2 gap-px shrink-0 rounded-lg overflow-hidden">
    <div className="bg-[#627EEA] flex items-center justify-center p-0.5">
      <img src={ethLogo} alt="ETH" className="w-full h-full object-contain" />
    </div>
    <div className="bg-[#213147] flex items-center justify-center p-0.5">
      <img src={arbLogo} alt="ARB" className="w-full h-full object-contain" />
    </div>
    <div className="bg-[#0052FF] flex items-center justify-center p-0.5">
      <img src={baseLogo} alt="Base" className="w-full h-full object-contain" />
    </div>
    <div className="bg-[#F3BA2F] flex items-center justify-center p-0.5">
      <img src={bnbLogo} alt="BNB" className="w-full h-full object-contain" />
    </div>
  </div>
);

const CHAINS = [
  { key: "near",   label: "NEAR",     logo: nearLogo,   logoClass: "near-logo" },
  { key: "solana", label: "Solana",   logo: solanaLogo, logoClass: "" },
  { key: "eth",    label: "EVM",      logo: ethLogo,    logoClass: "" },
  { key: "zec",    label: "Zcash",    logo: zecLogo,    logoClass: "" },
] as const;

type ChainKey = (typeof CHAINS)[number]["key"];

// ── Per-row component so each row can run its own query ──────────────────────

type ChainRowProps = {
  chain: (typeof CHAINS)[number];
  address: string | null;
  nearAccountId: string | null;
  isGrayedOut: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

const ChainRow = ({ chain, address, nearAccountId, isGrayedOut, onConnect, onDisconnect }: ChainRowProps) => {
  const isConnected = address !== null;
  const showBindButton = isConnected && chain.key !== "near" && !isGrayedOut;

  const boundWalletsQuery = useQuery({
    ...dewAccountQueries.walletsByAbstractAccountQueryOptions({ nearAccountId: nearAccountId }),
    enabled: showBindButton && nearAccountId !== null,
  });

  const abstractAccountsQuery = useQuery({
    ...dewAccountQueries.abstractAccountsByWalletQueryOptions({ blockchainAddress: address, chain: chain.key }),
    enabled: showBindButton,
  });

  const isBound = useMemo(() => {
    if (!boundWalletsQuery.data || !address) return false;
    return boundWalletsQuery.data.some((w) => {
      const [blockchainId, blockchainAddress] = w;
      if(blockchainId === 'solana'){
        return blockchainAddress.toLowerCase() === address.toLowerCase();
      }

      if(blockchainId === 'evm'){
        return blockchainAddress.toLowerCase() === address.toLowerCase();
      }

      if(blockchainId === 'noirzec'){
        return blockchainAddress.toLowerCase() === address.toLowerCase();
      }
      return false;
    });
  }, [boundWalletsQuery.data, address]);

  const isBoundToOtherAccount = useMemo(() => {
    if (!abstractAccountsQuery.data || abstractAccountsQuery.data.length === 0) return false;
    if (!nearAccountId) return true;
    return !abstractAccountsQuery.data.includes(nearAccountId);
  }, [abstractAccountsQuery.data, nearAccountId]);

  const bindDisabled = isBound || isBoundToOtherAccount || (nearAccountId !== null && boundWalletsQuery.isPending);

  const { signMessage } = useWalletSelector();

  const addWalletMutation = useMutation({
    mutationFn: async () => {
      const [existingBlockchainId, existingBlockchainAddress] = boundWalletsQuery.data![0];
      const existingChain = dewFactoryUtils.getChainNameFromBlockchainId(existingBlockchainId);
      await dewAccountUtils.signAndAddWallet({
        blockchainAddress: existingBlockchainAddress,
        chain: existingChain,
        newBlockchainAddress: address!,
        newChain: chain.key,
        nearAddress: nearAccountId!,
        signMessage: (msg) => signMessage(existingChain, msg),
      });

      // wait 1s to ensure the wallet is added on-chain before we refetch
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletsByAbstractAccount", nearAccountId] });
      queryClient.invalidateQueries({ queryKey: ["abstractAccountsByWallet", address, chain.key] });
    },
    onError: (error) => {
      toast.error("Failed to bind wallet", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  return (
    <li
      className="connect-wallet-list-items flex-col items-stretch"
      style={{ cursor: "default" }}
    >
      {/* Main row: logo + info on left, connect/disconnect on right */}
      <div className="flex items-center justify-between w-full" style={{ opacity: isGrayedOut ? 0.4 : 1 }}>
        <div className="flex items-center gap-3 min-w-0">
          {chain.key === "eth" ? (
            <EvmCombinedLogo />
          ) : (
            <div className={`list-logo shrink-0 ${chain.logoClass}`}>
              <img src={chain.logo} alt={chain.label} />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight">{chain.label}</p>
            {isConnected && (
              <p className="text-xs text-gray truncate">{stringUtils.omitText(address)}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 ml-3">
          {isConnected ? (
            <button
              onClick={onDisconnect}
              className="text-xs px-3 py-1.5 rounded-md border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors duration-200 font-medium"
            >
              Disconnect
            </button>
          ) : (
            <button
              disabled={isGrayedOut}
              onClick={onConnect}
              className="text-xs px-3 py-1.5 rounded-md bg-primary text-black font-bold hover:opacity-90 transition-opacity duration-200 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Bind row — indented to align with chain name */}
      {showBindButton && (
        <div className="flex items-center gap-2 mt-2 pl-13 w-full">
          {isBound ? (
            <span className="text-xs text-primary font-medium">✓ Bound</span>
          ) : isBoundToOtherAccount ? (
            <span className="text-xs text-amber-400">Bound to a different account</span>
          ) : (
            <button
              disabled={bindDisabled || addWalletMutation.isPending}
              onClick={() => {
                if (!nearAccountId) {
                  useWalletStore.getState().setPendingAbstractAccountCreation({
                    address: address!,
                    chain: chain.key,
                  });
                } else {
                  addWalletMutation.mutate();
                }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-primary/40 text-primary font-medium transition-opacity duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {addWalletMutation.isPending ? (
                <CircularProgress size="small" />
              ) : (
                "Bind account"
              )}
            </button>
          )}
        </div>
      )}

      {isGrayedOut && (
        <p className="text-xs text-gray mt-1">
          Mixing of native NEAR and non-NEAR wallet is not supported
        </p>
      )}
    </li>
  );
};

// ── Modal ────────────────────────────────────────────────────────────────────

const ConnectWalletModal = () => {
  const { signOutChain, signIn } = useWalletSelector();
  const isOpen = useWalletStore((s) => s.isConnectWalletModalOpen);
  const connectedWallets = useWalletStore((s) => s.connectedWallets);
  const nearAccountId = useWalletStore((s) => s.nearAccountId);

  const handleClose = () => useWalletStore.getState().closeConnectWalletModal();

  const getConnectedAddress = (chain: ChainKey) =>
    connectedWallets.find((w) => w.supportedChains.includes(chain))?.address ?? null;

  const isNearConnected = getConnectedAddress("near") !== null;
  const hasNonNearConnected =
    getConnectedAddress("solana") !== null ||
    getConnectedAddress("eth") !== null ||
    getConnectedAddress("zec") !== null;

  const isChainGrayedOut = (chain: ChainKey) => {
    if (chain === "near") return hasNonNearConnected;
    return isNearConnected;
  };

  const handleConnect = (chain: ChainKey) => {
    if (chain === "near") { nearConnector.connect(); return; }
    if (chain === "solana") { useWalletStore.getState().openSolanaWalletModal(); return; }
    if (chain === "eth") { useWalletStore.getState().openEvmWalletModal(); return; }
    if (chain === "zec") { signIn("zec"); return; }
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
        <h2 className="text-2xl font-semibold mb-0 mt-4">Connect Wallet</h2>
        <p className="text-sm text-gray font-regular mb-4">
          Manage your wallet connections.
        </p>
        <ul className="mb-8 flex flex-col gap-3">
          {CHAINS.map((chain, i) => (
            <Motion key={chain.key} direction="left" duration={0.4} delay={0.3 + i * 0.05}>
              <ChainRow
                chain={chain}
                address={getConnectedAddress(chain.key)}
                nearAccountId={nearAccountId}
                isGrayedOut={isChainGrayedOut(chain.key)}
                onConnect={() => handleConnect(chain.key)}
                onDisconnect={() => signOutChain(chain.key)}
              />
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

export default memo(ConnectWalletModal);
