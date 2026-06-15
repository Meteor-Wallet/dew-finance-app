import closeIcon from "../../assets/close.svg";
import Modal from "react-modal";
import { memo, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../queryClient";
import { toast } from "sonner";
import { vaultQueries, type TAsset } from "../../queries/vault";
import { assetUtils } from "../../utils/assetUtils";
import Big from "big.js";
import { vaultMutations } from "../../mutations/vault";
import { CircularProgress } from "../utils/CircularProgress";
import { stringUtils } from "../../utils/stringUtils";
import { intentsQueries } from "../../queries/intents";
import { vaultUtils } from "../../utils/vaultUtils";
import { ChainSelect, CHAIN_META, type ChainOption } from "../utils/ChainSelect";
import { oneClickUtils } from "../../utils/1clickUtils";
import { useWalletSelector } from "../../walletSelector";
import { dewAccountUtils } from "../../utils/dewAccountUtils";
import { useWalletStore } from "../../stores/wallet_store";
import { useShallow } from "zustand/react/shallow";
import { dewFactoryUtils } from "../../utils/dewFactoryUtils";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: TAsset;
  rawAmount: string;
  vaultId: string;
  nearAddress: string;
}

const ClaimModal = memo(({ isOpen, onClose, asset, rawAmount, vaultId, nearAddress }: ClaimModalProps) => {
  const vaultMeta = vaultUtils.vaults.find((v) => v.vault_id === vaultId);
  const usingAbstractAccount = dewFactoryUtils.isAbstractAccount(nearAddress);
  const { assetIcon, assetSymbol, assetDecimals } = assetUtils.useAssetSymbolAndIcon({ asset });
  const { signMessage } = useWalletSelector();
  const connectedWallets = useWalletStore(useShallow((s) => s.connectedWallets));

  // ── Chain select (abstract account only) ─────────────────────────────────
  const chainOptions = useMemo<ChainOption[]>(() => {
    if (!usingAbstractAccount) return [];
    const vaultChains = (vaultMeta?.chains ?? []).filter((c) => c !== "near");
    return vaultChains.map((c) => {
      const connectedWallet = connectedWallets.find((w) => w.supportedChains.includes(c));
      return {
        chain: c,
        address: connectedWallet?.address ?? null,
        disabled: !connectedWallet,
        ...(CHAIN_META[c] ?? { logo: "", label: c }),
      };
    });
  }, [vaultMeta, connectedWallets, usingAbstractAccount]);

  const [selectedChain, setSelectedChain] = useState<ChainOption | null>(null);

  useEffect(() => {
    setSelectedChain((prev) => {
      const enabled = chainOptions.filter((o) => !o.disabled);
      if (enabled.length === 0) return null;
      if (prev && enabled.some((o) => o.chain === prev.chain)) return prev;
      return enabled[0];
    });
  }, [chainOptions]);

  const destChain = selectedChain?.chain ?? null;

  // ── Claimable amount display ──────────────────────────────────────────────
  const amountFormatted = useMemo(() => {
    if (assetDecimals === null) return "—";
    try {
      return Big(rawAmount).div(Big(10).pow(assetDecimals)).round(Math.min(6, assetDecimals), Big.roundDown).toFixed();
    } catch {
      return "—";
    }
  }, [rawAmount, assetDecimals]);

  // ── 1Click token resolution ───────────────────────────────────────────────
  const assetContractId = "FungibleToken" in asset ? asset.FungibleToken.contract_id : null;

  const tokensQuery = useQuery({
    ...intentsQueries.get1ClickTokens(),
    enabled: usingAbstractAccount && !!destChain,
  });

  const { nearToken, destChainToken } = useMemo(() => {
    if (!usingAbstractAccount || !tokensQuery.data || !assetContractId || !destChain) {
      return { nearToken: null, destChainToken: null };
    }
    const pairEntry = oneClickUtils.tokenPairMap[assetContractId];
    if (!pairEntry) return { nearToken: null, destChainToken: null };

    const blockchain = oneClickUtils.chainNameTo1ClickBlockchain(destChain);
    const destContractAddress = pairEntry[blockchain as "eth" | "arb" | "sol"];
    if (!destContractAddress) return { nearToken: null, destChainToken: null };

    return {
      nearToken: tokensQuery.data.find((t) => t.blockchain === "near" && t.contractAddress === assetContractId) ?? null,
      destChainToken: tokensQuery.data.find(
        (t) => t.blockchain === blockchain && t.contractAddress?.toLowerCase() === destContractAddress.toLowerCase(),
      ) ?? null,
    };
  }, [usingAbstractAccount, tokensQuery.data, assetContractId, destChain]);

  // ── Step 1: dry bridge quote based on fixed claimable amount ─────────────
  const step1BridgeQuoteQuery = useQuery({
    ...intentsQueries.get1ClickQuotation({
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: 1,
      originAsset: nearToken?.assetId ?? "",
      depositType: "ORIGIN_CHAIN",
      destinationAsset: destChainToken?.assetId ?? "",
      amount: rawAmount,
      refundTo: nearAddress,
      refundType: "ORIGIN_CHAIN",
      recipient: selectedChain?.address ?? "",
      recipientType: "DESTINATION_CHAIN",
    }),
    enabled: usingAbstractAccount && !!nearToken && !!destChainToken && !!selectedChain?.address && !!rawAmount,
    staleTime: 0,
  });

  // ── Stepper state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bridgeQuoteResult, setBridgeQuoteResult] = useState<{ amountInFormatted: string; amountOutFormatted: string } | null>(null);
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);
  const [bridgeDepositAddress, setBridgeDepositAddress] = useState<string | null>(null);

  const bridgeStatusQuery = useQuery({
    ...intentsQueries.get1ClickStatus({ depositAddress: bridgeDepositAddress! }),
    enabled: !!bridgeDepositAddress,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "SUCCESS" || s === "REFUNDED" || s === "FAILED" ? false : 10_000;
    },
    staleTime: 0,
  });

  // ── Step 2: abstract account balance ─────────────────────────────────────
  const abstractAccountBalanceQuery = useQuery({
    ...vaultQueries.getFtBalanceQueryOptions({
      contractId: assetContractId!,
      accountId: nearAddress,
    }),
    enabled: step === 2 && !!assetContractId,
    refetchInterval: 3000,
  });

  const abstractAccountBalanceFormatted = useMemo(() => {
    if (!abstractAccountBalanceQuery.data || assetDecimals === null) return null;
    try {
      return Big(abstractAccountBalanceQuery.data).div(Big(10).pow(assetDecimals)).toFixed();
    } catch {
      return null;
    }
  }, [abstractAccountBalanceQuery.data, assetDecimals]);

  // ── Step 2: dry bridge quote ──────────────────────────────────────────────
  const step2BridgeQuoteQuery = useQuery({
    ...intentsQueries.get1ClickQuotation({
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: 1,
      originAsset: nearToken?.assetId ?? "",
      depositType: "ORIGIN_CHAIN",
      destinationAsset: destChainToken?.assetId ?? "",
      amount: abstractAccountBalanceQuery.data ?? "0",
      refundTo: nearAddress,
      refundType: "ORIGIN_CHAIN",
      recipient: selectedChain?.address ?? "",
      recipientType: "DESTINATION_CHAIN",
    }),
    enabled: step === 2 && !!abstractAccountBalanceQuery.data && !!nearToken && !!destChainToken && !!selectedChain?.address,
    staleTime: 0,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const claimMutation = vaultMutations.useClaimClaimableAssetsMutation();

  const bridgeMutation = useMutation({
    mutationFn: async ({ amountInBaseUnits }: { amountInBaseUnits: string }) => {
      const quote = await queryClient.fetchQuery({
        ...intentsQueries.get1ClickQuotation({
          dry: false,
          swapType: "EXACT_INPUT",
          slippageTolerance: 1,
          originAsset: nearToken!.assetId,
          depositType: "ORIGIN_CHAIN",
          destinationAsset: destChainToken!.assetId,
          amount: amountInBaseUnits,
          refundTo: nearAddress,
          refundType: "ORIGIN_CHAIN",
          recipient: selectedChain!.address!,
          recipientType: "DESTINATION_CHAIN",
        }),
        staleTime: 0,
      });

      setBridgeQuoteResult({
        amountInFormatted: quote.quote.amountInFormatted,
        amountOutFormatted: quote.quote.amountOutFormatted,
      });

      const depositAddress = quote.quote.depositAddress;
      if (!depositAddress) throw new Error("No deposit address returned from bridge");

      setBridgeDepositAddress(depositAddress);
      await dewAccountUtils.signAndSendTransaction({
        transaction: {
          receiverId: assetContractId!,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "ft_transfer",
                args: { amount: amountInBaseUnits, receiver_id: depositAddress },
                deposit: "1",
                gas: "100000000000000",
              },
            },
          ],
        },
        nearAccountId: nearAddress,
        blockchainAddress: selectedChain!.address!,
        chain: destChain!,
        signMessage: (msg) => signMessage(destChain!, msg),
        bridgeOriginAddress: depositAddress,
      });

      return quote;
    },
    onSuccess: (quote) => {
      setBridgeTxHash(quote.signature);
    },
    onError: (error) => {
      toast.error("Bridge failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleClose = () => {
    if (claimMutation.isPending || bridgeMutation.isPending) return;
    setStep(1);
    setBridgeQuoteResult(null);
    setBridgeTxHash(null);
    setBridgeDepositAddress(null);
    onClose();
  };

  const canClaim = !usingAbstractAccount || (!!destChain && !!selectedChain?.address);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={!claimMutation.isPending && !bridgeMutation.isPending}
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
        <h2 className="text-2xl font-semibold mb-0 mt-4">
          {step === 1 ? "Claim" : step === 2 ? "Bridge Setup" : "Bridge to Destination"}
        </h2>

        {/* Stepper — only for abstract account */}
        {usingAbstractAccount && (
          <div className="flex items-center mt-4">
            {(["Claim", "Review", "Bridge"] as const).map((label, i) => {
              const s = (i + 1) as 1 | 2 | 3;
              const done = s < step;
              const active = s === step;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      done ? "bg-green-500 text-black" : active ? "bg-primary text-black" : "bg-card-border text-gray"
                    }`}>
                      {done ? "✓" : s}
                    </div>
                    <span className={`text-xs mt-1 whitespace-nowrap ${active ? "text-white" : "text-gray"}`}>{label}</span>
                  </div>
                  {s < 3 && <div className={`flex-1 h-px mx-2 mb-4 ${s < step ? "bg-green-500" : "bg-card-border"}`} />}
                </div>
              );
            })}
          </div>
        )}

        <hr className="border-t border-border-color mt-6 mb-6" />

        {/* ── Step 1: Claim ───────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            {usingAbstractAccount && chainOptions.length > 0 && (
              <ChainSelect
                label="Bridge to"
                options={chainOptions}
                value={selectedChain}
                onChange={setSelectedChain}
              />
            )}

            <div className="bg-card-background rounded-sm p-4 px-5 space-y-3 mt-5 mb-6 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray">Claimable amount</span>
                <div className="flex items-center gap-1.5">
                  <span>{amountFormatted} {assetSymbol}</span>
                  <img src={assetIcon} alt={assetSymbol} className="w-4 h-4" />
                </div>
              </div>
              {usingAbstractAccount && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray">Destination chain</span>
                    <span>{destChain ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray">Expected on {destChain}</span>
                    <div className="flex items-center gap-1.5">
                      {step1BridgeQuoteQuery.isFetching ? (
                        <CircularProgress size="small" />
                      ) : step1BridgeQuoteQuery.data ? (
                        <span>≈ {stringUtils.truncateDecimals(step1BridgeQuoteQuery.data.quote.amountOutFormatted)} {assetSymbol}</span>
                      ) : (
                        <span className="text-gray">—</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                if (usingAbstractAccount) {
                  claimMutation.mutate(
                    {
                      vaultId,
                      accountId: nearAddress,
                      asset,
                      usingAbstractAccount: true,
                      blockchainAddress: selectedChain!.address!,
                      chain: destChain!,
                      signMessage: (msg) => signMessage(destChain!, msg),
                    },
                    { onSuccess: () => setStep(2) },
                  );
                } else {
                  claimMutation.mutate(
                    { vaultId, accountId: nearAddress, asset, usingAbstractAccount: false },
                    { onSuccess: () => handleClose() },
                  );
                }
              }}
              disabled={claimMutation.isPending || !canClaim}
              className="disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black py-3 rounded-sm font-bold text-base confirm-button-shadow"
            >
              {claimMutation.isPending ? <CircularProgress size="small" /> : "Claim"}
            </button>
          </>
        )}

        {/* ── Step 2: Review bridge ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="py-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-500 text-xl font-bold">✓</span>
              </div>
              <p className="text-white font-medium">Assets claimed</p>
              <p className="text-gray text-sm text-center">Tokens are in your NEAR abstract account. Review the bridge details below.</p>
            </div>
            <div className="bg-card-background rounded-sm p-4 px-5 space-y-3 mb-6 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray">Amount to bridge</span>
                <div className="flex items-center gap-2">
                  {abstractAccountBalanceFormatted
                    ? <span>{stringUtils.truncateDecimals(abstractAccountBalanceFormatted)} {assetSymbol}</span>
                    : <CircularProgress size="small" />}
                  <button
                    onClick={() => abstractAccountBalanceQuery.refetch()}
                    disabled={abstractAccountBalanceQuery.isFetching}
                    className="text-gray hover:text-white disabled:opacity-40 transition-colors"
                    title="Refresh balance"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={abstractAccountBalanceQuery.isFetching ? "animate-spin" : ""}>
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray">Expected on {destChain}</span>
                <div className="flex items-center gap-1.5">
                  {step2BridgeQuoteQuery.isFetching ? (
                    <CircularProgress size="small" />
                  ) : step2BridgeQuoteQuery.data ? (
                    <span>≈ {stringUtils.truncateDecimals(step2BridgeQuoteQuery.data.quote.amountOutFormatted)} {assetSymbol}</span>
                  ) : abstractAccountBalanceQuery.data ? (
                    <span className="text-gray text-xs">Fetching quote...</span>
                  ) : (
                    <span className="text-gray">—</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (abstractAccountBalanceQuery.data) {
                  setStep(3);
                  bridgeMutation.mutate({ amountInBaseUnits: abstractAccountBalanceQuery.data });
                }
              }}
              disabled={!abstractAccountBalanceQuery.data || bridgeMutation.isPending}
              className="disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black py-3 rounded-sm font-bold text-base confirm-button-shadow"
            >
              Continue to Bridge
            </button>
          </div>
        )}

        {/* ── Step 3: Bridge in progress / done ──────────────────────────── */}
        {step === 3 && (
          <div className="py-4">
            {bridgeMutation.isPending && !bridgeQuoteResult ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <CircularProgress size="medium" />
                <p className="text-white font-medium">Fetching bridge quote...</p>
              </div>
            ) : (bridgeMutation.isPending || bridgeTxHash) && bridgeQuoteResult ? (
              <>
                {!bridgeTxHash ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <CircularProgress size="medium" />
                    <p className="text-white font-medium">Waiting for wallet confirmation...</p>
                    <p className="text-gray text-sm text-center">Please confirm the bridge transaction in your wallet</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    {bridgeStatusQuery.data?.status === "SUCCESS" ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <span className="text-green-500 text-xl font-bold">✓</span>
                        </div>
                        <p className="text-white font-medium">Bridge complete</p>
                      </>
                    ) : bridgeStatusQuery.data?.status === "REFUNDED" ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <span className="text-amber-400 text-xl">↩</span>
                        </div>
                        <p className="text-white font-medium">Bridge refunded</p>
                        <p className="text-gray text-sm text-center">Your tokens were refunded</p>
                      </>
                    ) : bridgeStatusQuery.data?.status === "FAILED" ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                          <span className="text-red-400 text-xl font-bold">✗</span>
                        </div>
                        <p className="text-white font-medium">Bridge failed</p>
                      </>
                    ) : (
                      <>
                        <CircularProgress size="medium" />
                        <p className="text-white font-medium">
                          {bridgeStatusQuery.data?.status === "PROCESSING" || bridgeStatusQuery.data?.status === "KNOWN_DEPOSIT_TX"
                            ? "Bridge in progress..."
                            : "Waiting for bridge..."}
                        </p>
                        {bridgeStatusQuery.data?.status && (
                          <p className="text-gray text-xs uppercase tracking-wide">{bridgeStatusQuery.data.status.replace(/_/g, " ")}</p>
                        )}
                        <div className="flex items-center gap-2 w-full mt-2 px-3 py-2 rounded-sm bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs">
                          <span>ℹ</span>
                          <span>Bridge may take more than a minute to complete.</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="bg-card-background rounded-sm p-4 space-y-3 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray">Amount in</span>
                    <span>{stringUtils.truncateDecimals(bridgeQuoteResult.amountInFormatted)} {assetSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">Amount out</span>
                    <span>{stringUtils.truncateDecimals(bridgeQuoteResult.amountOutFormatted)} {assetSymbol}</span>
                  </div>
                </div>
                {bridgeTxHash && (bridgeStatusQuery.data?.status === "SUCCESS" || bridgeStatusQuery.data?.status === "REFUNDED" || bridgeStatusQuery.data?.status === "FAILED") && (
                  <button
                    onClick={handleClose}
                    className="flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black py-3 rounded-sm font-bold text-base confirm-button-shadow"
                  >
                    Done
                  </button>
                )}
              </>
            ) : null}
          </div>
        )}

        <button
          onClick={handleClose}
          className="modal-close-btn absolute bg-card-secondary-color top-[0px] right-[15px] md:-top-[30px] md:-right-[15px] w-[30px] h-[30px] md:w-[40px] md:h-[40px] flex justify-center items-center transition-all duration-300 rounded-full mt-4 text-xs underline"
        >
          <img className="w-[10px] md:w-[13px]" src={closeIcon} alt="Close" />
        </button>
      </div>
    </Modal>
  );
});

export default ClaimModal;
