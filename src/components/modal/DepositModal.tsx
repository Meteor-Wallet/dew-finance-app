import closeIcon from "../../assets/close.svg";
import Modal from "react-modal";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useVaultActionStore } from "../../stores/vault_action_store";
import { useWalletStore } from "../../stores/wallet_store";
import { useShallow } from "zustand/react/shallow";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../queryClient";
import { toast } from "sonner";
import { vaultQueries, type TAsset } from "../../queries/vault";
import { useWalletSelector } from "../../walletSelector";
import { assetUtils } from "../../utils/assetUtils";
import { stringUtils } from "../../utils/stringUtils";
import { accountQueries } from "../../queries/account";
import { intentsQueries } from "../../queries/intents";
import { vaultMutations } from "../../mutations/vault";
import { CircularProgress } from "../utils/CircularProgress";
import { vaultUtils } from "../../utils/vaultUtils";
import Big from "big.js";
import { ChainSelect, CHAIN_META, type ChainOption } from "../utils/ChainSelect";
import { oneClickUtils } from "../../utils/1clickUtils";
import { dewAccountUtils } from "../../utils/dewAccountUtils";

const Asset = ({
  onClick,
  asset,
}: {
  asset: TAsset;
  onClick: (asset: TAsset) => void;
}) => {
  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset,
  });
  return (
    <div
      onClick={() => onClick(asset)}
      className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-input-focus"
    >
      <img src={assetIcon} alt={assetSymbol} className="w-5 h-5" />
      <span className="text-sm text-white">{assetSymbol}</span>
    </div>
  );
};

const Input = () => {
  const depositAmount = useVaultActionStore((s) => s.depositAmount);
  return (
    <input
      type="text"
      placeholder="0.0"
      className="flex-1 min-w-0 px-3 py-3 bg-input-background text-white placeholder-gray-500 text-base outline-hidden transition"
      value={depositAmount}
      onChange={(e) =>
        useVaultActionStore
          .getState()
          .updateDepositAmount({ amount: e.target.value })
      }
    />
  );
};

const DepositModal = () => {
  const isDepositWalletModalOpen = useVaultActionStore(
    (s) => s.isDepositWalletModalOpen,
  );
  const { vaultContractId } = useParams<{ vaultContractId: string }>();
  const [open, setOpen] = useState(false);
  const tokenDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tokenDropdownRef.current && !tokenDropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const vaultMeta = vaultUtils.vaults.find((v) => v.vault_id === vaultContractId);

  const connectedWallets = useWalletStore(
    useShallow((s) => s.connectedWallets)
  );

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
      const enabledOptions = chainOptions.filter((o) => !o.disabled);
      if (enabledOptions.length === 0) return null;
      if (prev && enabledOptions.some((o) => o.chain === prev.chain)) return prev;
      return enabledOptions[0];
    });
  }, [chainOptions]);

  const depositChain = selectedChain?.chain ?? null;
  const nearAddress = useWalletStore((s) => s.nearAccountId);

  const selectedAsset = useVaultActionStore((s) => s.selectedDepositAsset);
  const slippagePercent = useVaultActionStore((s) => s.depositSlippagePercent);
  const depositAmount = useVaultActionStore((s) => s.depositAmount);

  const allAcceptedTokensQuery = useQuery({
    ...vaultQueries.getAllAcceptedTokensQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== undefined,
  });

  const availableTokens = useMemo(
    () => allAcceptedTokensQuery.data ?? [],
    [allAcceptedTokensQuery.data],
  );

  useEffect(() => {
    useVaultActionStore
      .getState()
      .setInitialSelectedDepositAsset({ assets: availableTokens });
  }, [availableTokens]);

  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset: selectedAsset,
  });

  const exchangeRateForSelectedAsset = assetUtils.useExchangeRateForAsset({
    asset: selectedAsset,
    vaultContractId: vaultContractId ?? null,
  });

  const isNearDeposit = !depositChain || depositChain === "near";

  const tokensQuery = useQuery({
    ...intentsQueries.get1ClickTokens(),
    enabled: !isNearDeposit,
  });

  const { sourceToken, destToken } = useMemo(() => {
    if (isNearDeposit || !tokensQuery.data || !selectedAsset || !depositChain) {
      return { sourceToken: null, destToken: null };
    }
    if (!("FungibleToken" in selectedAsset)) return { sourceToken: null, destToken: null };

    const nearContractId = selectedAsset.FungibleToken.contract_id;
    const pairEntry = oneClickUtils.tokenPairMap[nearContractId];
    if (!pairEntry) return { sourceToken: null, destToken: null };

    const blockchain = oneClickUtils.chainNameTo1ClickBlockchain(depositChain);
    const sourceContractAddress = pairEntry[blockchain as "eth" | "arb" | "sol"];
    if (!sourceContractAddress) return { sourceToken: null, destToken: null };

    return {
      sourceToken: tokensQuery.data.find(
        (t) => t.blockchain === blockchain && t.contractAddress?.toLowerCase() === sourceContractAddress.toLowerCase()
      ) ?? null,
      destToken: tokensQuery.data.find(
        (t) => t.blockchain === "near" && t.contractAddress === nearContractId
      ) ?? null,
    };
  }, [isNearDeposit, tokensQuery.data, selectedAsset, depositChain]);

  const amountInBaseUnits = useMemo(() => {
    if (!depositAmount || !sourceToken) return null;
    try {
      const n = Big(depositAmount).mul(Big(10).pow(sourceToken.decimals));
      return n.gt(0) ? n.toFixed(0) : null;
    } catch { return null; }
  }, [depositAmount, sourceToken]);

  const bridgeQuoteEnabled =
    !isNearDeposit &&
    !!sourceToken &&
    !!destToken &&
    !!amountInBaseUnits &&
    !!nearAddress &&
    !!selectedChain?.address;

  const bridgeQuoteQuery = useQuery({
    ...intentsQueries.get1ClickQuotation({
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: Number(slippagePercent),
      originAsset: sourceToken?.assetId ?? "",
      depositType: "ORIGIN_CHAIN",
      destinationAsset: destToken?.assetId ?? "",
      amount: amountInBaseUnits ?? "0",
      refundTo: selectedChain?.address ?? "",
      refundType: "ORIGIN_CHAIN",
      recipient: nearAddress ?? "",
      recipientType: "DESTINATION_CHAIN",
    }),
    enabled: bridgeQuoteEnabled,
    refetchInterval: 5 * 60 * 1000,
  });

  const expectedToReceiveAmount = useMemo(() => {
    try {
      if (!exchangeRateForSelectedAsset || !vaultMeta) return "0";
      const baseAmount = !isNearDeposit && bridgeQuoteQuery.data
        ? bridgeQuoteQuery.data.quote.amountOutFormatted
        : (depositAmount || "0");
      return Big(baseAmount)
        .mul(exchangeRateForSelectedAsset.assetToShare)
        .round(Math.min(6, vaultMeta.share_deciamls), Big.roundDown)
        .toFixed();
    } catch {
      return "0";
    }
  }, [exchangeRateForSelectedAsset, depositAmount, vaultMeta, isNearDeposit, bridgeQuoteQuery.data]);

  const vaultShareMetadataQuery = useQuery({
    ...vaultQueries.getFtMetadataQueryOptions({
      tokenId: vaultContractId!,
    }),
    enabled: vaultContractId !== undefined,
  });

  const assetContractId = selectedAsset && "FungibleToken" in selectedAsset
    ? selectedAsset.FungibleToken.contract_id
    : null;

  const assetMetadataQuery = useQuery({
    ...vaultQueries.getFtMetadataQueryOptions({ tokenId: assetContractId! }),
    enabled: !!assetContractId,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const abstractAccountBalanceQuery = useQuery({
    ...vaultQueries.getFtBalanceQueryOptions({
      contractId: assetContractId!,
      accountId: nearAddress!,
    }),
    enabled: step === 3 && !!assetContractId && !!nearAddress,
    refetchInterval: 3000,
  });

  const abstractAccountBalanceFormatted = useMemo(() => {
    if (!abstractAccountBalanceQuery.data || !assetMetadataQuery.data) return null;
    try {
      return Big(abstractAccountBalanceQuery.data)
        .div(Big(10).pow(assetMetadataQuery.data.decimals))
        .toFixed();
    } catch {
      return null;
    }
  }, [abstractAccountBalanceQuery.data, assetMetadataQuery.data]);

  const balance = accountQueries.useAccountBalance({ asset: selectedAsset, chain: depositChain });

  const depositToVaultMutation = vaultMutations.useDepositToVaultMutation();
  const { requestDeposit, signMessage } = useWalletSelector();

  
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);
  const [bridgeQuoteResult, setBridgeQuoteResult] = useState<{ amountInFormatted: string; amountOutFormatted: string } | null>(null);
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

  const bridgeMutation = useMutation({
    mutationFn: async () => {
      const quote = await queryClient.fetchQuery({
        ...intentsQueries.get1ClickQuotation({
          dry: false,
          swapType: "EXACT_INPUT",
          slippageTolerance: Number(slippagePercent),
          originAsset: sourceToken!.assetId,
          depositType: "ORIGIN_CHAIN",
          destinationAsset: destToken!.assetId,
          amount: amountInBaseUnits!,
          refundTo: selectedChain!.address!,
          refundType: "ORIGIN_CHAIN",
          recipient: nearAddress!,
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
      const txHash = await requestDeposit({
        contractAddress: sourceToken!.contractAddress!,
        amount: BigInt(amountInBaseUnits!),
        receiverAddress: depositAddress,
        chain: depositChain!,
        decimals: sourceToken!.decimals,
      });

      return { txHash, quote };
    },
    onSuccess: ({ txHash }) => {
      setBridgeTxHash(txHash);
    },
    onError: (error) => {
      toast.error("Bridge failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setStep(1);
      setBridgeTxHash(null);
      setBridgeQuoteResult(null);
    },
  });

  const prepareBridgeMutation = useMutation({
    mutationFn: async () => {
      const isStorageDeposited = await queryClient.fetchQuery(
        vaultQueries.getCheckIsStorageDepositedQueryOptions({
          vaultContractId: vaultContractId!,
          nearAddress: nearAddress!,
        }),
      );
      if (!isStorageDeposited) {
        await dewAccountUtils.sponsorStorageDeposit({
          vaultContractId: vaultContractId!,
          nearAccountId: nearAddress!,
        });
      }
    },
    onSuccess: () => {
      setStep(2);
      bridgeMutation.mutate();
    },
    onError: (error) => {
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const isExceedingBalance = useMemo(() => {
    if (!depositAmount || !balance.data?.formatted) return false;
    try {
      return Big(depositAmount).gt(Big(balance.data.formatted));
    } catch {
      return false;
    }
  }, [depositAmount, balance.data?.formatted]);

  const isBelowNonNearMinimum = useMemo(() => {
    if (isNearDeposit || !vaultMeta?.nonNearMinReadableDeposit || !depositAmount) return false;
    try {
      return Big(depositAmount).lt(vaultMeta.nonNearMinReadableDeposit);
    } catch {
      return false;
    }
  }, [isNearDeposit, vaultMeta?.nonNearMinReadableDeposit, depositAmount]);

  const needsAbstractAccount = !isNearDeposit && !nearAddress;

  const canDeposit =
    !isExceedingBalance &&
    !isBelowNonNearMinimum &&
    !needsAbstractAccount &&
    (isNearDeposit || bridgeQuoteQuery.data) &&
    nearAddress &&
    selectedAsset &&
    exchangeRateForSelectedAsset &&
    vaultShareMetadataQuery.data &&
    vaultContractId &&
    selectedChain &&
    depositAmount;

  const handleClose = () => {
    if (depositToVaultMutation.isPending || bridgeMutation.isPending) return;
    setStep(1);
    setBridgeTxHash(null);
    setBridgeQuoteResult(null);
    setBridgeDepositAddress(null);
    useVaultActionStore.getState().closeDepositWalletModal();
  };

  return (
    <Modal
      isOpen={isDepositWalletModalOpen}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={!depositToVaultMutation.isPending}
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
          {step === 1 ? `Deposit Into ${vaultMeta?.name}` : step === 2 ? "Bridge in Progress" : "Complete Deposit"}
        </h2>

        {/* Stepper — only for cross-chain */}
        {!isNearDeposit && (
          <div className="flex items-center mt-4">
            {(["Deposit", "Bridge", "Confirm"] as const).map((label, i) => {
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

        {/* ── Step 1: Deposit form ───────────────────────────────────────── */}
        {step === 1 && (
          <>
            {chainOptions.length > 0 && (
              <ChainSelect
                label="From"
                options={chainOptions}
                value={selectedChain}
                onChange={setSelectedChain}
              />
            )}

            <div className="flex justify-between items-center mt-5 mb-1.5">
              <p className="text-sm font-base text-white">Amount</p>
              <p className="text-sm font-base text-gray flex items-center gap-1.5">
                Available:{" "}
                {balance.isLoading ? (
                  <CircularProgress size="small" />
                ) : (
                  stringUtils.truncateDecimals(balance.data?.formatted)
                )}
              </p>
            </div>

            <div className="relative md:max-w-md mt-1" ref={tokenDropdownRef}>
              <div className="flex items-stretch rounded-sm overflow-hidden bg-input-background focus-within:ring-2 focus-within:ring-input-focus transition">
                <div
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 bg-input-inner-background px-4 select-none cursor-pointer shrink-0"
                >
                  <img src={assetIcon} alt={assetSymbol} className="w-6 h-6" />
                  <span className="text-sm text-white font-semibold whitespace-nowrap">{assetSymbol}</span>
                </div>
                <Input />
                <div
                  onClick={() => {
                    if (balance.data) {
                      useVaultActionStore.getState().updateDepositAmount({ amount: balance.data.formatted });
                    }
                  }}
                  className="flex items-center px-3 bg-input-background cursor-pointer transition-opacity duration-200 hover:opacity-50"
                >
                  <span className="bg-input-inner-background text-white text-xs px-3 py-1.5 rounded-sm">Max</span>
                </div>
              </div>
              {open && (
                <div className="absolute left-0 top-full mt-1 w-40 bg-input-inner-background rounded-md shadow-lg z-10">
                  {availableTokens
                    .filter((e) => {
                      if ("FungibleToken" in e) {
                        if (vaultUtils.DEPRECATED_TOKENS.includes(e.FungibleToken.contract_id)) return false;
                        return true;
                      }
                      return false;
                    })
                    .map((token) => (
                      <Asset
                        key={"MultiToken" in token ? token.MultiToken.token_id : "ft"}
                        asset={token}
                        onClick={(asset) => {
                          useVaultActionStore.getState().changeDepositAsset({ asset });
                          setOpen(false);
                        }}
                      />
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-5 mb-2">
              <p className="text-sm">Transaction Details</p>
              {!isNearDeposit && <span className="text-xs text-gray">Quote refreshes every 5 min</span>}
            </div>
            <div className="bg-card-background rounded-sm p-4 px-5 space-y-4">
              {!isNearDeposit && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray">Bridge output</span>
                  <div className="flex items-center gap-1.5">
                    {bridgeQuoteQuery.isFetching ? (
                      <CircularProgress size="small" />
                    ) : bridgeQuoteQuery.data ? (
                      <span>≈ {stringUtils.truncateDecimals(bridgeQuoteQuery.data.quote.amountOutFormatted)} {assetSymbol}</span>
                    ) : !sourceToken || !destToken ? (
                      <span className="text-red-400 text-xs">Not supported on this chain</span>
                    ) : (
                      <span className="text-gray">—</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray">Share price</span>
                <div className="flex gap-1.5 items-center">
                  <span>1 {assetSymbol}</span>
                  <img src={assetIcon} alt={assetSymbol} className="w-5 h-5" />
                  <ArrowLeftRight className="text-gray" size={12} />
                  <span>{stringUtils.truncateDecimals(exchangeRateForSelectedAsset?.assetToShare)} {vaultShareMetadataQuery.data?.symbol}</span>
                  {vaultShareMetadataQuery.data?.icon && (
                    <img src={vaultShareMetadataQuery.data.icon} alt={vaultShareMetadataQuery.data.symbol} className="w-5 h-5" />
                  )}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray">Expected to receive</span>
                <div className="flex gap-1.5 items-center">
                  {!isNearDeposit && bridgeQuoteQuery.isFetching ? (
                    <CircularProgress size="small" />
                  ) : (
                    <>
                      <span>{expectedToReceiveAmount} {vaultShareMetadataQuery.data?.symbol}</span>
                      {vaultShareMetadataQuery.data?.icon && (
                        <img src={vaultShareMetadataQuery.data.icon} alt={vaultShareMetadataQuery.data.symbol} className="w-5 h-5" />
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray">Slippage tolerance</span>
                <span>{slippagePercent}%</span>
              </div>
            </div>

            {isBelowNonNearMinimum && depositAmount && (
              <div className="flex items-start gap-2 mt-4 px-4 py-3 rounded-sm bg-amber-950/60 border border-amber-600/50 text-amber-400 text-sm">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>Minimum deposit is {vaultMeta?.nonNearMinReadableDeposit} {assetSymbol} for non-NEAR wallets</span>
              </div>
            )}

            {needsAbstractAccount && (
              <div className="flex items-start gap-2 mt-4 px-4 py-3 rounded-sm bg-amber-950/60 border border-amber-600/50 text-amber-400 text-sm">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>A NEAR abstract account is required to deposit from a non-NEAR wallet.</span>
              </div>
            )}

            <button
              onClick={() => {
                if (needsAbstractAccount) {
                  handleClose();
                  useWalletStore.getState().setPendingAbstractAccountCreation({
                    address: selectedChain!.address!,
                    chain: depositChain!,
                  });
                  return;
                }
                if (isNearDeposit) {
                  if (!depositToVaultMutation.isPending && canDeposit) {
                    const { depositAmount: amount, depositSlippagePercent } = useVaultActionStore.getState();
                    depositToVaultMutation.mutate({
                      nearAddress,
                      asset: selectedAsset,
                      amount,
                      exchangeRate: exchangeRateForSelectedAsset.assetToShare,
                      sharesDecimals: vaultShareMetadataQuery.data.decimals,
                      vaultContractId,
                      slippagePercent: depositSlippagePercent,
                      blockchainAddress: selectedChain!.address!,
                      usingAbstractAccount: false,
                      chain: depositChain!,
                      signMessage: (msg) => signMessage(depositChain!, msg),
                    });
                  }
                } else {
                  prepareBridgeMutation.mutate();
                }
              }}
              disabled={!needsAbstractAccount && (depositToVaultMutation.isPending || prepareBridgeMutation.isPending || !canDeposit)}
              className="disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-bold text-base confirm-button-shadow relative px-6 mt-10 mb-4"
            >
              {depositToVaultMutation.isPending || prepareBridgeMutation.isPending ? (
                <CircularProgress size="small" />
              ) : needsAbstractAccount ? (
                "Create Account"
              ) : isExceedingBalance ? (
                "Insufficient balance"
              ) : isBelowNonNearMinimum ? (
                `Min ${vaultMeta?.nonNearMinReadableDeposit} ${assetSymbol}`
              ) : isNearDeposit ? (
                "Deposit"
              ) : (
                "Bridge & Deposit"
              )}
            </button>
          </>
        )}

        {/* ── Step 2: Bridge in progress ─────────────────────────────────── */}
        {step === 2 && (
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
                    <p className="text-gray text-sm text-center">Please confirm the transaction in your wallet</p>
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
                {bridgeTxHash && (
                  bridgeStatusQuery.data?.status === "SUCCESS" ? (
                    <button
                      onClick={() => setStep(3)}
                      className="flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black py-3 rounded-sm font-bold text-base confirm-button-shadow"
                    >
                      Continue to Deposit
                    </button>
                  ) : bridgeStatusQuery.data?.status === "REFUNDED" || bridgeStatusQuery.data?.status === "FAILED" ? (
                    <button
                      onClick={handleClose}
                      className="flex justify-center items-center w-full bg-secondary text-white py-3 rounded-sm font-bold text-base"
                    >
                      Close
                    </button>
                  ) : null
                )}
              </>
            ) : null}
          </div>
        )}

        {/* ── Step 3: Final vault deposit ────────────────────────────────── */}
        {step === 3 && (
          <div className="py-4">
            <p className="text-gray text-sm mb-5">
              Your tokens are being bridged to NEAR. Once received, click below to complete the vault deposit.
            </p>
            <div className="bg-card-background rounded-sm p-4 px-5 space-y-3 mb-6 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray">Bridge output</span>
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
              <div className="flex justify-between">
                <span className="text-gray">Expected vault shares</span>
                <div className="flex items-center gap-1.5">
                  <span>{expectedToReceiveAmount} {vaultShareMetadataQuery.data?.symbol}</span>
                  {vaultShareMetadataQuery.data?.icon && (
                    <img src={vaultShareMetadataQuery.data.icon} alt={vaultShareMetadataQuery.data.symbol} className="w-4 h-4" />
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (!depositToVaultMutation.isPending && canDeposit && abstractAccountBalanceFormatted) {
                  const { depositSlippagePercent } = useVaultActionStore.getState();
                  depositToVaultMutation.mutate({
                    nearAddress,
                    asset: selectedAsset,
                    amount: abstractAccountBalanceFormatted,
                    exchangeRate: exchangeRateForSelectedAsset.assetToShare,
                    sharesDecimals: vaultShareMetadataQuery.data.decimals,
                    vaultContractId,
                    slippagePercent: depositSlippagePercent,
                    blockchainAddress: selectedChain!.address!,
                    usingAbstractAccount: true,
                    chain: depositChain!,
                    signMessage: (msg) => signMessage(depositChain!, msg),
                  });
                }
              }}
              disabled={depositToVaultMutation.isPending || !canDeposit}
              className="disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black py-3 rounded-sm font-bold text-base confirm-button-shadow"
            >
              {depositToVaultMutation.isPending ? <CircularProgress size="small" /> : "Deposit into Vault"}
            </button>
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

export default memo(DepositModal);
