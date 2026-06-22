import Modal from "react-modal";
import closeIcon from "../../assets/close.svg";
import { memo, useEffect, useMemo, useState } from "react";
import { useWalletStore } from "../../stores/wallet_store";
import { useShallow } from "zustand/react/shallow";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient } from "../../queryClient";
import { vaultQueries } from "../../queries/vault";
import { intentsQueries } from "../../queries/intents";
import { dewAccountUtils } from "../../utils/dewAccountUtils";
import { dewAccountQueries } from "../../queries/dewAccount";
import { oneClickUtils } from "../../utils/1clickUtils";
import { ChainSelect, CHAIN_META, type ChainOption } from "../utils/ChainSelect";
import { CircularProgress } from "../utils/CircularProgress";
import { stringUtils } from "../../utils/stringUtils";
import { useWalletSelector } from "../../walletSelector";
import { useStaleBalances, type StaleBalance } from "../../hooks/useStaleBalances";
import type { ChainName } from "../../stores/wallet_store";

const PAIR_BLOCKCHAIN_TO_CHAIN: Partial<Record<string, ChainName>> = {
  eth: "eth",
  arb: "arbitrum",
  sol: "solana",
};

const WithdrawStaleFundsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { data: staleBalances } = useStaleBalances();

  const [selectedToken, setSelectedToken] = useState<StaleBalance | null>(null);

  useEffect(() => {
    if (staleBalances.length > 0 && !selectedToken) {
      setSelectedToken(staleBalances[0]);
    }
    if (selectedToken && !staleBalances.find((b) => b.contractId === selectedToken.contractId)) {
      setSelectedToken(staleBalances[0] ?? null);
    }
  }, [staleBalances, selectedToken]);

  const nearAddress = useWalletStore((s) => s.nearAccountId);
  const connectedWallets = useWalletStore(useShallow((s) => s.connectedWallets));

  const boundWalletsQuery = useQuery({
    ...dewAccountQueries.walletsByAbstractAccountQueryOptions({ nearAccountId: nearAddress }),
    enabled: !!nearAddress,
  });

  const tokensQuery = useQuery(intentsQueries.get1ClickTokens());

  // Build chain options for the selected token based on tokenPairMap
  const chainOptions = useMemo<ChainOption[]>(() => {
    if (!selectedToken) return [];
    const pairs = oneClickUtils.tokenPairMap[selectedToken.contractId] ?? {};
    const boundAddresses = new Set(
      (boundWalletsQuery.data ?? []).map(([, addr]) => addr.toLowerCase()),
    );
    return Object.keys(pairs)
      .map((blockchain) => {
        const chain = PAIR_BLOCKCHAIN_TO_CHAIN[blockchain];
        if (!chain) return null;
        const connectedWallet = connectedWallets.find((w) => w.supportedChains.includes(chain));
        const address = connectedWallet?.address ?? null;
        const isConnected = !!connectedWallet;
        const isBound =
          !nearAddress ||
          !boundWalletsQuery.data ||
          !address ||
          boundAddresses.has(address.toLowerCase());
        return {
          chain,
          address,
          disabled: !isConnected || !isBound,
          disabledReason: !isConnected ? "Not connected" : !isBound ? "Not bound" : undefined,
          ...(CHAIN_META[chain] ?? { logo: "", label: chain }),
        } satisfies ChainOption;
      })
      .filter((o): o is ChainOption => o !== null);
  }, [selectedToken, connectedWallets, nearAddress, boundWalletsQuery.data]);

  const [selectedChain, setSelectedChain] = useState<ChainOption | null>(null);

  useEffect(() => {
    setSelectedChain((prev) => {
      const enabled = chainOptions.filter((o) => !o.disabled);
      if (enabled.length === 0) return null;
      if (prev && enabled.some((o) => o.chain === prev.chain)) return prev;
      return enabled[0];
    });
  }, [chainOptions]);

  // 1-click token resolution for the selected token + chain
  const { nearToken, destChainToken } = useMemo(() => {
    if (!tokensQuery.data || !selectedToken || !selectedChain) {
      return { nearToken: null, destChainToken: null };
    }
    const blockchain = oneClickUtils.chainNameTo1ClickBlockchain(selectedChain.chain);
    const pairEntry = oneClickUtils.tokenPairMap[selectedToken.contractId];
    const destContractAddress = pairEntry?.[blockchain as "eth" | "arb" | "sol"];
    if (!destContractAddress) return { nearToken: null, destChainToken: null };

    return {
      nearToken:
        tokensQuery.data.find(
          (t) => t.blockchain === "near" && t.contractAddress === selectedToken.contractId,
        ) ?? null,
      destChainToken:
        tokensQuery.data.find(
          (t) =>
            t.blockchain === blockchain &&
            t.contractAddress?.toLowerCase() === destContractAddress.toLowerCase(),
        ) ?? null,
    };
  }, [tokensQuery.data, selectedToken, selectedChain]);

  // Step state
  const [step, setStep] = useState<1 | 2>(1);
  const [bridgeQuoteResult, setBridgeQuoteResult] = useState<{
    amountInFormatted: string;
    amountOutFormatted: string;
  } | null>(null);
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);
  const [bridgeDepositAddress, setBridgeDepositAddress] = useState<string | null>(null);

  // Bridge preview quote
  const balanceQuery = useQuery({
    ...vaultQueries.getFtBalanceQueryOptions({
      contractId: selectedToken?.contractId ?? "",
      accountId: nearAddress ?? "",
    }),
    enabled: !!selectedToken && !!nearAddress,
    refetchInterval: step === 1 ? 30_000 : false,
  });

  const previewQuoteQuery = useQuery({
    ...intentsQueries.get1ClickQuotation({
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: 30,
      originAsset: nearToken?.assetId ?? "",
      depositType: "ORIGIN_CHAIN",
      destinationAsset: destChainToken?.assetId ?? "",
      amount: balanceQuery.data ?? "0",
      refundTo: nearAddress ?? "",
      refundType: "ORIGIN_CHAIN",
      recipient: selectedChain?.address ?? "",
      recipientType: "DESTINATION_CHAIN",
    }),
    enabled:
      !!nearToken &&
      !!destChainToken &&
      !!balanceQuery.data &&
      !!nearAddress &&
      !!selectedChain?.address,
    staleTime: 0,
  });

  const { signMessage } = useWalletSelector();

  const bridgeMutation = useMutation({
    mutationFn: async ({ amountInBaseUnits }: { amountInBaseUnits: string }) => {
      const quote = await queryClient.fetchQuery({
        ...intentsQueries.get1ClickQuotation({
          dry: false,
          swapType: "EXACT_INPUT",
          slippageTolerance: 30,
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

      setBridgeDepositAddress(depositAddress);

      await dewAccountUtils.signAndSendTransaction({
        transaction: {
          receiverId: selectedToken!.contractId,
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
        nearAccountId: nearAddress!,
        blockchainAddress: selectedChain!.address!,
        chain: selectedChain!.chain,
        signMessage: (msg) => signMessage(selectedChain!.chain, msg),
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
      setStep(1);
      setBridgeQuoteResult(null);
    },
  });

  const bridgeStatusQuery = useQuery({
    ...intentsQueries.get1ClickStatus({ depositAddress: bridgeDepositAddress! }),
    enabled: !!bridgeDepositAddress,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "SUCCESS" || s === "REFUNDED" || s === "FAILED" ? false : 10_000;
    },
    staleTime: 0,
  });

  const handleClose = () => {
    if (bridgeMutation.isPending) return;
    setStep(1);
    setBridgeQuoteResult(null);
    setBridgeTxHash(null);
    setBridgeDepositAddress(null);
    onClose();
  };

  const canBridge =
    !!balanceQuery.data &&
    !!nearToken &&
    !!destChainToken &&
    !!nearAddress &&
    !!selectedChain?.address &&
    !!previewQuoteQuery.data;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={!bridgeMutation.isPending}
      closeTimeoutMS={300}
      className="absolute z-30 bottom-0 md:-translate-x-1/2 w-full max-w-full bg-[linear-gradient(139deg,#000000,#0C0C0C)] md:border-t md:border-card-border shadow-xl rounded-t-2xl transition-all duration-300 animate-drawer-slide-up md:top-1/2 md:bottom-auto md:left-1/2 md:-translate-y-1/2 md:w-[500px] md:rounded-2xl md:border md:animate-none"
      overlayClassName="fixed inset-0 z-20 bg-black/40 backdrop-blur-md flex items-end md:items-center justify-center"
    >
      <div className="w-full md:w-[500px] p-6 bg-[linear-gradient(139deg,#000000,#0C0C0C)] border-t border-t-modal-border md:border md:border-modal-border rounded-t-2xl md:rounded-2xl">
        <h2 className="text-2xl font-semibold mb-0 mt-4">Withdraw Stale Funds</h2>

        <hr className="border-t border-border-color mt-6 mb-6" />

        {/* ── Step 1: Select token + chain ─────────────────────────────── */}
        {step === 1 && (
          <>
            {/* Token list */}
            <p className="text-sm text-gray mb-3">Select token to withdraw</p>
            <div className="space-y-2 mb-6">
              {staleBalances.length === 0 ? (
                <p className="text-sm text-gray text-center py-4">No stale balances found</p>
              ) : (
                staleBalances.map((b) => (
                  <div
                    key={b.contractId}
                    onClick={() => setSelectedToken(b)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-sm cursor-pointer transition-colors border ${
                      selectedToken?.contractId === b.contractId
                        ? "border-primary bg-card-background"
                        : "border-card-border bg-card-background hover:border-primary/50"
                    }`}
                  >
                    {b.icon && <img src={b.icon} alt={b.symbol} className="w-7 h-7 rounded-full" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{b.symbol}</p>
                    </div>
                    <p className="text-sm text-white font-semibold">
                      {stringUtils.truncateDecimals(b.balanceFormatted)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Chain select */}
            {chainOptions.length > 0 && (
              <ChainSelect
                label="To"
                options={chainOptions}
                value={selectedChain}
                onChange={setSelectedChain}
              />
            )}

            {selectedToken && chainOptions.length === 0 && (
              <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-sm bg-amber-950/60 border border-amber-600/50 text-amber-400 text-sm">
                <span className="shrink-0">⚠</span>
                <span>No supported destination chains for this token. Connect a compatible wallet first.</span>
              </div>
            )}

            {/* Bridge preview */}
            {selectedToken && selectedChain && (
              <div className="bg-card-background rounded-sm p-4 px-5 space-y-3 mb-6 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray">Amount to bridge</span>
                  <span className="text-white">
                    {stringUtils.truncateDecimals(selectedToken.balanceFormatted)} {selectedToken.symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray">Expected on {selectedChain.label}</span>
                  <div className="flex items-center gap-1.5">
                    {previewQuoteQuery.isFetching ? (
                      <CircularProgress size="small" />
                    ) : previewQuoteQuery.data ? (
                      <span>
                        ≈ {stringUtils.truncateDecimals(previewQuoteQuery.data.quote.amountOutFormatted)}{" "}
                        {selectedToken.symbol}
                      </span>
                    ) : !nearToken || !destChainToken ? (
                      <span className="text-red-400 text-xs">Not supported on this chain</span>
                    ) : (
                      <span className="text-gray">—</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray">Slippage tolerance</span>
                  <span>0.3%</span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (canBridge && balanceQuery.data) {
                  setStep(2);
                  bridgeMutation.mutate({ amountInBaseUnits: balanceQuery.data });
                }
              }}
              disabled={!canBridge || bridgeMutation.isPending}
              className="disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black py-3 rounded-sm font-bold text-base confirm-button-shadow mt-2 mb-4"
            >
              Bridge to Wallet
            </button>
          </>
        )}

        {/* ── Step 2: Bridge execution ──────────────────────────────────── */}
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
                    <p className="text-gray text-sm text-center">
                      Please confirm the bridge transaction in your wallet
                    </p>
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
                          {bridgeStatusQuery.data?.status === "PROCESSING" ||
                          bridgeStatusQuery.data?.status === "KNOWN_DEPOSIT_TX"
                            ? "Bridge in progress..."
                            : "Waiting for bridge..."}
                        </p>
                        {bridgeStatusQuery.data?.status && (
                          <p className="text-gray text-xs uppercase tracking-wide">
                            {bridgeStatusQuery.data.status.replace(/_/g, " ")}
                          </p>
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
                    <span>
                      {stringUtils.truncateDecimals(bridgeQuoteResult.amountInFormatted)}{" "}
                      {selectedToken?.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">Amount out</span>
                    <span>
                      {stringUtils.truncateDecimals(bridgeQuoteResult.amountOutFormatted)}{" "}
                      {selectedToken?.symbol}
                    </span>
                  </div>
                </div>

                {bridgeTxHash &&
                  (bridgeStatusQuery.data?.status === "SUCCESS" ||
                    bridgeStatusQuery.data?.status === "REFUNDED" ||
                    bridgeStatusQuery.data?.status === "FAILED") && (
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

export default memo(WithdrawStaleFundsModal);
