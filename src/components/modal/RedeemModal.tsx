import closeIcon from "../../assets/close.svg";
import Modal from "react-modal";
import { memo, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useVaultActionStore } from "../../stores/vault_action_store";
import { useParams } from "react-router-dom";
import { useWalletStore } from "../../stores/wallet_store";
import { useShallow } from "zustand/react/shallow";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../queryClient";
import { toast } from "sonner";
import { vaultQueries } from "../../queries/vault";
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

const Input = () => {
  const withdrawAmount = useVaultActionStore((s) => s.withdrawAmount);
  return (
    <input
      type="text"
      placeholder="0.0"
      className="flex-1 min-w-0 px-3 py-3 bg-input-background text-white placeholder-gray-500 text-base outline-hidden transition"
      value={withdrawAmount}
      onChange={(e) =>
        useVaultActionStore
          .getState()
          .updateWithdrawAmount({ amount: e.target.value })
      }
    />
  );
};

const RedeemModal = () => {
  const isRedeemWalletModalOpen = useVaultActionStore(
    (s) => s.isRedeemWalletModalOpen,
  );
  const { vaultContractId } = useParams<{ vaultContractId: string }>();

  const vaultMeta = vaultUtils.vaults.find((v) => v.vault_id === vaultContractId);

  const connectedWallets = useWalletStore(useShallow((s) => s.connectedWallets));
  const nearAddress = useWalletStore((s) => s.nearAccountId);

  // ── Chain select ──────────────────────────────────────────────────────────
  const chainOptions = useMemo<ChainOption[]>(() => {
    const vaultChains = vaultMeta?.chains ?? [];
    return vaultChains.map((c) => {
      const connectedWallet = connectedWallets.find((w) => w.supportedChains.includes(c));
      return {
        chain: c,
        address: connectedWallet?.address ?? null,
        disabled: !connectedWallet,
        ...(CHAIN_META[c] ?? { logo: "", label: c }),
      };
    });
  }, [vaultMeta, connectedWallets]);

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
  const isNearRedeem = !destChain || destChain === "near";

  // ── Vault / asset data ────────────────────────────────────────────────────
  const selectedAsset = useVaultActionStore((s) => s.selectedWithdrawAsset);
  const slippagePercent = useVaultActionStore((s) => s.withdrawSlippagePercent);
  const withdrawAmount = useVaultActionStore((s) => s.withdrawAmount);

  const allAcceptedTokensQuery = useQuery({
    ...vaultQueries.getAvailableRedeemAssetsQueryOptions({ vaultId: vaultContractId! }),
    enabled: vaultContractId !== undefined,
  });

  const availableTokens = useMemo(
    () => allAcceptedTokensQuery.data ?? [],
    [allAcceptedTokensQuery.data],
  );

  useEffect(() => {
    useVaultActionStore.getState().setInitialSelectedWithdrawAsset({ assets: availableTokens });
  }, [availableTokens]);

  const { assetIcon, assetSymbol, assetDecimals } = assetUtils.useAssetSymbolAndIcon({ asset: selectedAsset });

  const exchangeRateForAsset = assetUtils.useExchangeRateForAsset({
    asset: selectedAsset,
    vaultContractId: vaultContractId ?? null,
  });

  const vaultShareMetadataQuery = useQuery({
    ...vaultQueries.getFtMetadataQueryOptions({ tokenId: vaultContractId! }),
    enabled: vaultContractId !== undefined,
  });

  const myPositionQuery = useQuery({
    ...vaultQueries.getMyPositionQueryOptions({
      vaultContractId: vaultContractId!,
      nearAddress: nearAddress!,
    }),
    enabled: nearAddress !== null && vaultContractId !== undefined,
  });

  const myPosition = useMemo(() => {
    if (vaultShareMetadataQuery.data && myPositionQuery.data) {
      return Big(myPositionQuery.data)
        .div(Big(10).pow(vaultShareMetadataQuery.data.decimals))
        .toFixed();
    }
    return "0";
  }, [vaultShareMetadataQuery.data, myPositionQuery.data]);

  const expectedRedeemAmount = useMemo(() => {
    try {
      if (exchangeRateForAsset && assetDecimals) {
        return Big(withdrawAmount || "0")
          .mul(exchangeRateForAsset.shareToAsset)
          .round(Math.min(6, assetDecimals), Big.roundDown)
          .toFixed();
      }
      return "0";
    } catch {
      return "0";
    }
  }, [exchangeRateForAsset, withdrawAmount, assetDecimals]);

  const assetBalanceQuery = useQuery({
    ...vaultQueries.getAssetBalanceQueryOptions({
      vaultId: vaultContractId!,
      asset: selectedAsset!,
    }),
    enabled: isRedeemWalletModalOpen && vaultContractId !== undefined && selectedAsset !== undefined,
  });

  const isLiquidityInsufficient = useMemo(() => {
    if (!assetBalanceQuery.data || !withdrawAmount || !exchangeRateForAsset || assetDecimals === null) return false;
    try {
      const expectedAssetAmount = Big(withdrawAmount)
        .mul(exchangeRateForAsset.shareToAsset)
        .mul(Big(10).pow(assetDecimals));
      return Big(assetBalanceQuery.data.available_amount).lt(expectedAssetAmount);
    } catch {
      return false;
    }
  }, [assetBalanceQuery.data, withdrawAmount, exchangeRateForAsset, assetDecimals]);

  // ── 1Click token resolution ───────────────────────────────────────────────
  const tokensQuery = useQuery({
    ...intentsQueries.get1ClickTokens(),
    enabled: !isNearRedeem,
  });

  const { nearToken, destChainToken } = useMemo(() => {
    if (isNearRedeem || !tokensQuery.data || !selectedAsset || !destChain) {
      return { nearToken: null, destChainToken: null };
    }
    if (!("FungibleToken" in selectedAsset)) return { nearToken: null, destChainToken: null };

    const nearContractId = selectedAsset.FungibleToken.contract_id;
    const pairEntry = oneClickUtils.tokenPairMap[nearContractId];
    if (!pairEntry) return { nearToken: null, destChainToken: null };

    const blockchain = oneClickUtils.chainNameTo1ClickBlockchain(destChain);
    const destContractAddress = pairEntry[blockchain as "eth" | "arb" | "sol"];
    if (!destContractAddress) return { nearToken: null, destChainToken: null };

    return {
      nearToken: tokensQuery.data.find(
        (t) => t.blockchain === "near" && t.contractAddress === nearContractId,
      ) ?? null,
      destChainToken: tokensQuery.data.find(
        (t) => t.blockchain === blockchain && t.contractAddress?.toLowerCase() === destContractAddress.toLowerCase(),
      ) ?? null,
    };
  }, [isNearRedeem, tokensQuery.data, selectedAsset, destChain]);

  const redeemAmountInBaseUnits = useMemo(() => {
    if (!expectedRedeemAmount || !nearToken) return null;
    try {
      const n = Big(expectedRedeemAmount).mul(Big(10).pow(nearToken.decimals));
      return n.gt(0) ? n.toFixed(0) : null;
    } catch { return null; }
  }, [expectedRedeemAmount, nearToken]);

  // ── Bridge preview quote ──────────────────────────────────────────────────
  const bridgeQuoteEnabled =
    !isNearRedeem &&
    !!nearToken &&
    !!destChainToken &&
    !!redeemAmountInBaseUnits &&
    !!nearAddress &&
    !!selectedChain?.address;

  const bridgeQuoteQuery = useQuery({
    ...intentsQueries.get1ClickQuotation({
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: Number(slippagePercent),
      originAsset: nearToken?.assetId ?? "",
      depositType: "ORIGIN_CHAIN",
      destinationAsset: destChainToken?.assetId ?? "",
      amount: redeemAmountInBaseUnits ?? "0",
      refundTo: nearAddress ?? "",
      refundType: "ORIGIN_CHAIN",
      recipient: selectedChain?.address ?? "",
      recipientType: "DESTINATION_CHAIN",
    }),
    enabled: bridgeQuoteEnabled,
    refetchInterval: 5 * 60 * 1000,
  });

  // ── Step 2: abstract account balance + dry bridge quote ──────────────────
  const assetContractId = selectedAsset && "FungibleToken" in selectedAsset
    ? selectedAsset.FungibleToken.contract_id
    : null;

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const abstractAccountBalanceQuery = useQuery({
    ...vaultQueries.getFtBalanceQueryOptions({
      contractId: assetContractId!,
      accountId: nearAddress!,
    }),
    enabled: step === 2 && !!assetContractId && !!nearAddress,
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

  const step2BridgeQuoteQuery = useQuery({
    ...intentsQueries.get1ClickQuotation({
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: Number(slippagePercent),
      originAsset: nearToken?.assetId ?? "",
      depositType: "ORIGIN_CHAIN",
      destinationAsset: destChainToken?.assetId ?? "",
      amount: abstractAccountBalanceQuery.data ?? "0",
      refundTo: nearAddress ?? "",
      refundType: "ORIGIN_CHAIN",
      recipient: selectedChain?.address ?? "",
      recipientType: "DESTINATION_CHAIN",
    }),
    enabled: step === 2 && !!abstractAccountBalanceQuery.data && !!nearToken && !!destChainToken && !!nearAddress && !!selectedChain?.address,
    staleTime: 0,
  });

  // ── Stepper state (continued) ─────────────────────────────────────────────
  const [bridgeQuoteResult, setBridgeQuoteResult] = useState<{
    amountInFormatted: string;
    amountOutFormatted: string;
  } | null>(null);
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { signMessage } = useWalletSelector();
  const withdrawFromVaultMutation = vaultMutations.useWithdrawFromVaultMutation();

  const bridgeMutation = useMutation({
    mutationFn: async ({ amountInBaseUnits }: { amountInBaseUnits: string }) => {
      const quote = await queryClient.fetchQuery({
        ...intentsQueries.get1ClickQuotation({
          dry: false,
          swapType: "EXACT_INPUT",
          slippageTolerance: Number(slippagePercent),
          originAsset: nearToken!.assetId,
          depositType: "ORIGIN_CHAIN",
          destinationAsset: destChainToken!.assetId,
          amount: amountInBaseUnits,
          refundTo: nearAddress!,
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

      const ftContractId = (selectedAsset as { FungibleToken: { contract_id: string } }).FungibleToken.contract_id;
      
      await dewAccountUtils.signAndSendTransaction({
        transaction: {
          receiverId: ftContractId,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "ft_transfer",
                args: {
                  amount: amountInBaseUnits,
                  receiver_id: depositAddress,
                },
                deposit: "1",
                gas: "100000000000000"
              }
            }
          ]
        },
        nearAccountId: nearAddress!,
        blockchainAddress: selectedChain!.address!,
        chain: destChain!,
        signMessage: (msg) => signMessage(destChain!, msg),
        bridgeOriginAddress: depositAddress,
      })

      return quote;
    },
    onSuccess: (quote) => {
      setBridgeTxHash(quote.signature);
    },
    onError: (error) => {
      toast.error("Bridge failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setStep(2);
      setBridgeQuoteResult(null);
    },
  });

  const handleClose = () => {
    if (withdrawFromVaultMutation.isPending || bridgeMutation.isPending) return;
    setStep(1);
    setBridgeQuoteResult(null);
    setBridgeTxHash(null);
    useVaultActionStore.getState().updateWithdrawAmount({ amount: "" });
    useVaultActionStore.getState().closeRedeemWalletModal();
  };

  const isExceedingBalance = useMemo(() => {
    if (!withdrawAmount || !myPosition) return false;
    try {
      return Big(withdrawAmount).gt(Big(myPosition));
    } catch {
      return false;
    }
  }, [withdrawAmount, myPosition]);

  const canWithdraw =
    !isExceedingBalance &&
    (isNearRedeem || bridgeQuoteQuery.data) &&
    nearAddress &&
    selectedAsset &&
    exchangeRateForAsset &&
    vaultShareMetadataQuery.data &&
    vaultContractId &&
    assetDecimals !== null &&
    withdrawAmount;

  return (
    <Modal
      isOpen={isRedeemWalletModalOpen}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={!withdrawFromVaultMutation.isPending && !bridgeMutation.isPending}
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
        <h2 className="text-2xl font-semibold mb-0 mt-4">
          {step === 1 ? "Redeem" : step === 2 ? "Vault Redeem" : "Bridge to Destination"}
        </h2>

        {/* Stepper — only for cross-chain */}
        {!isNearRedeem && (
          <div className="flex items-center mt-4">
            {(["Redeem", "Vault", "Bridge"] as const).map((label, i) => {
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

        {/* ── Step 1: Redeem form ───────────────────────────────────────── */}
        {step === 1 && (
          <>
            {chainOptions.length > 0 && (
              <ChainSelect
                label="To"
                options={chainOptions}
                value={selectedChain}
                onChange={setSelectedChain}
              />
            )}

            <div className="flex justify-between items-center mt-5 mb-1.5">
              <p className="text-sm font-base text-white">Amount</p>
              <p className="text-sm font-base text-gray">Available: {stringUtils.truncateDecimals(myPosition)}</p>
            </div>

            <div className="relative md:max-w-md mt-1">
              <div className="flex items-stretch rounded-sm overflow-hidden bg-input-background focus-within:ring-2 focus-within:ring-input-focus transition">
                <div className="flex items-center gap-2 bg-input-inner-background px-4 select-none cursor-pointer shrink-0">
                  <img
                    src={vaultShareMetadataQuery.data?.icon || ""}
                    alt={vaultShareMetadataQuery.data?.symbol}
                    className="w-6 h-6"
                  />
                  <span className="text-sm text-white font-semibold whitespace-nowrap">
                    {vaultShareMetadataQuery.data?.symbol}
                  </span>
                </div>
                <Input />
                <div
                  onClick={() =>
                    useVaultActionStore.getState().updateWithdrawAmount({ amount: myPosition })
                  }
                  className="flex items-center px-3 bg-input-background cursor-pointer transition-opacity duration-200 hover:opacity-50"
                >
                  <span className="bg-input-inner-background text-white text-xs px-3 py-1.5 rounded-sm">Max</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-5 mb-2">
              <p className="text-sm">Transaction Details</p>
              {!isNearRedeem && <span className="text-xs text-gray">Quote refreshes every 5 min</span>}
            </div>
            <div className="bg-card-background rounded-sm p-4 px-5 space-y-4">
              {!isNearRedeem && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray">Bridge output</span>
                  <div className="flex items-center gap-1.5">
                    {bridgeQuoteQuery.isFetching ? (
                      <CircularProgress size="small" />
                    ) : bridgeQuoteQuery.data ? (
                      <span>≈ {stringUtils.truncateDecimals(bridgeQuoteQuery.data.quote.amountOutFormatted)} {assetSymbol}</span>
                    ) : !nearToken || !destChainToken ? (
                      <span className="text-red-400 text-xs">Not supported on this chain</span>
                    ) : (
                      <span className="text-gray">—</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray">Share price</span>
                <div className="flex gap-1.5 items-center justify-center">
                  <span>1 {vaultShareMetadataQuery.data?.symbol}</span>
                  {vaultShareMetadataQuery.data?.icon && (
                    <img src={vaultShareMetadataQuery.data.icon} alt={vaultShareMetadataQuery.data.symbol} className="w-5 h-5" />
                  )}
                  <ArrowLeftRight className="text-gray" size={12} />
                  <span>{stringUtils.truncateDecimals(exchangeRateForAsset?.shareToAsset)} {assetSymbol}</span>
                  <img src={assetIcon} alt={assetSymbol} className="w-5 h-5" />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray">Expected to receive</span>
                <div className="flex gap-1.5 items-center">
                  {!isNearRedeem && bridgeQuoteQuery.isFetching ? (
                    <CircularProgress size="small" />
                  ) : (
                    <span>
                      {isNearRedeem
                        ? `${expectedRedeemAmount} ${assetSymbol}`
                        : bridgeQuoteQuery.data
                          ? `${stringUtils.truncateDecimals(bridgeQuoteQuery.data.quote.amountOutFormatted)} ${assetSymbol}`
                          : `${expectedRedeemAmount} ${assetSymbol}`}
                    </span>
                  )}
                  <img src={assetIcon} alt={assetSymbol} className="w-5 h-5" />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray">Slippage tolerance</span>
                <span>{slippagePercent}%</span>
              </div>
            </div>

            {isLiquidityInsufficient && (
              <div className="flex items-start gap-2 mt-4 px-4 py-3 rounded-sm bg-amber-950/60 border border-amber-600/50 text-amber-400 text-sm">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>Insufficient liquidity, opting to async redeem</span>
              </div>
            )}

            <button
              onClick={() => {
                if (!withdrawFromVaultMutation.isPending && canWithdraw) {
                  if (isNearRedeem) {
                    withdrawFromVaultMutation.mutate({
                      nearAddress,
                      asset: selectedAsset,
                      share: withdrawAmount,
                      exchangeRate: exchangeRateForAsset.shareToAsset,
                      shareDecimals: vaultShareMetadataQuery.data.decimals,
                      vaultContractId,
                      slippagePercent,
                      assetDecimals,
                      usingAbstractAccount: false,
                      blockchainAddress: selectedChain!.address!,
                      chain: destChain!,
                      signMessage: (msg) => signMessage(destChain!, msg),
                    });
                  } else {
                    withdrawFromVaultMutation.mutate(
                      {
                        nearAddress,
                        asset: selectedAsset,
                        share: withdrawAmount,
                        exchangeRate: exchangeRateForAsset.shareToAsset,
                        shareDecimals: vaultShareMetadataQuery.data.decimals,
                        vaultContractId,
                        slippagePercent,
                        assetDecimals,
                        skipClose: true,
                        usingAbstractAccount: true,
                        blockchainAddress: selectedChain!.address!,
                        chain: destChain!,
                        signMessage: (msg) => signMessage(destChain!, msg),
                      },
                      { onSuccess: () => setStep(2) },
                    );
                  }
                }
              }}
              disabled={withdrawFromVaultMutation.isPending || !canWithdraw}
              className="disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-bold text-base confirm-button-shadow relative px-6 mt-10 mb-4"
            >
              {withdrawFromVaultMutation.isPending ? (
                <CircularProgress size="small" />
              ) : isExceedingBalance ? (
                "Insufficient balance"
              ) : isNearRedeem ? (
                "Redeem"
              ) : (
                "Redeem & Bridge"
              )}
            </button>
          </>
        )}

        {/* ── Step 2: Vault redeem done — confirm bridge ────────────────── */}
        {step === 2 && (
          <div className="py-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-500 text-xl font-bold">✓</span>
              </div>
              <p className="text-white font-medium">Vault redeem complete</p>
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

        {/* ── Step 3: Bridge to destination ────────────────────────────── */}
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
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-500 text-xl font-bold">✓</span>
                    </div>
                    <p className="text-white font-medium">Bridge transaction submitted</p>
                    <p className="text-gray text-xs break-all text-center max-w-xs">{bridgeTxHash}</p>
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
                {bridgeTxHash && (
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
};

export default memo(RedeemModal);
