import Motion from "../../components/utils/Motion";
import vaultIcon from "../../assets/vault-icon.png";
import Near from "../../assets/near.png";
import Btc from "../../assets/btc.png";
import { vaultActionStore, type TMode } from "../../stores/vault_action_store";
import { motion, AnimatePresence } from "framer-motion";
import { accountQueries } from "../../queries/account";
import { FLAT_LIST_TOKENS } from "../../intents/constants/tokens";
import { ArrowLeftRight } from "lucide-react";
import CountUp from "../../components/utils/CountUp";
import { useSearchParams } from "react-router-dom";
import { walletStore } from "../../stores/wallet_store";
import { useQuery } from "@tanstack/react-query";
import { vaultQueries } from "../../queries/vault";
import { useEffect, useMemo } from "react";
import _ from "lodash";
import { intentsQueries } from "../../queries/intents";
import { vaultMutations } from "../../mutations/vault";
import Big from "big.js";

const Input = () => {
  const amount = vaultActionStore.selectors.useAmount();
  return (
    <input
      type="text"
      placeholder="0.0"
      className="w-full pl-28 pr-16 py-3 rounded-sm bg-input-background text-white placeholder-gray-500 text-base outline-hidden focus:ring-2 focus:ring-input-focus focus:border-input-focus transition"
      value={amount}
      onChange={(e) =>
        vaultActionStore.store.trigger.updateAmount({
          amount: e.target.value,
        })
      }
    />
  );
};

const Token = () => {
  const selectedAsset = vaultActionStore.selectors.useSelectedAsset();

  let assetSymbol = "";
  let assetIcon = "";

  if (selectedAsset) {
    if ("MultiToken" in selectedAsset) {
      const tokenInfo = FLAT_LIST_TOKENS.find(
        (e) => e.defuseAssetId === selectedAsset.MultiToken.token_id
      );

      if (tokenInfo) {
        assetSymbol = tokenInfo.symbolWithoutChain;
        assetIcon = tokenInfo.icon;
      }
    }
  }

  // TODO: handle for FungibleToken

  return (
    <div className="absolute top-0 h-full flex items-center gap-2 bg-input-inner-background px-4 py-1 select-none pointer-events-none rounded-l-sm min-w-[95px]">
      <img src={assetIcon} alt={"NEAR"} className="w-6 h-6" />
      <span className="text-sm text-white font-semibold">{assetSymbol}</span>
    </div>
  );
};

export default function LeftPanel() {
  const [searchParams] = useSearchParams({
    vaultContractId: "stable-test-1.dew-finance.near",
  });

  const vaultContractId = searchParams.get("vaultContractId");
  const selectedChain = walletStore.selectors.useSelectedChain();
  const nearAddress = walletStore.selectors.useCurrentNearAccountId();

  const slippagePercent = vaultActionStore.selectors.useSlippagePercent();

  const allAcceptedTokensQuery = useQuery({
    ...vaultQueries.getAllAcceptedTokensQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });
  const actionMode = vaultActionStore.selectors.useMode();

  const selectedAsset = vaultActionStore.selectors.useSelectedAsset();

  const balance = accountQueries.useAccountBalance({
    asset: selectedAsset,
  });

  const intentsAddressQuery = useQuery({
    ...intentsQueries.getIntentsAddressQueryOptions({
      chain: selectedChain,
      nearAddress: nearAddress!,
    }),
    enabled: nearAddress !== null,
  });

  const exchangeRatesQuery = useQuery({
    ...vaultQueries.getAllExchangeRatesQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const vaultShareMetadataQuery = useQuery({
    ...vaultQueries.getVaultShareMetadataQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const connectedWalletAddress =
    walletStore.selectors.useConnectedWalletAddress();

  const vaultConfigQuery = useQuery({
    ...vaultQueries.getVaultConfigQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  let assetSymbol = "";
  let assetIcon = "";

  if (selectedAsset) {
    if ("MultiToken" in selectedAsset) {
      const tokenInfo = FLAT_LIST_TOKENS.find(
        (e) => e.defuseAssetId === selectedAsset.MultiToken.token_id
      );

      if (tokenInfo) {
        assetSymbol = tokenInfo.symbolWithoutChain;
        assetIcon = tokenInfo.icon;
      }
    }
  }

  // 1 share = X asset
  const exchangeRateForSelectedToken = useMemo(() => {
    if (vaultConfigQuery.data && exchangeRatesQuery.data) {
      const selectedExchangeRate = exchangeRatesQuery.data?.find((e) => {
        const [asset] = e;
        if (_.isEqual(asset, selectedAsset)) {
          return true;
        }
      });

      const rateDecimals = vaultConfigQuery.data.exchange_rate_decimals;

      if (selectedExchangeRate) {
        return Big(selectedExchangeRate[1])
          .div(Big(10).pow(rateDecimals))
          .toFixed();
      }
    }
  }, [exchangeRatesQuery.data, selectedAsset, vaultConfigQuery.data]);

  const availableTokens = useMemo(() => {
    return (
      allAcceptedTokensQuery.data?.filter((e) => {
        // TODO: handle for FungibleToken
        if ("MultiToken" in e) {
          const tokenInfo = FLAT_LIST_TOKENS.find(
            (token) => token.defuseAssetId === e.MultiToken.token_id
          );
          if (tokenInfo?.chainName === selectedChain) {
            return true;
          }
        }
        return false;
      }) || []
    );
  }, [allAcceptedTokensQuery.data, selectedChain]);

  useEffect(() => {
    vaultActionStore.store.trigger.setInitialSelectedToken({
      assets: availableTokens,
    });
  }, [availableTokens]);

  const depositToVaultMutation = vaultMutations.useDepositToVaultMutation();

  return (
    <div className="w-full h-full md:w-1/3 sticky top-5">
      {/* Input Section */}
      <Motion direction="left" duration={0.6} delay={0.3}>
        <div className="w-full bg-[linear-gradient(139deg,#1a1c27,#0D0D0D,#0D0D0D)]  border border-border-color rounded-lg shadow-lg">
          {/* Vault Heading */}
          <div className="flex items-center gap-4 p-6">
            <div className="w-[50px] h-[50px] relative">
              <img src={vaultIcon} />
              <img
                src={Near}
                className="absolute bottom-[-5px] right-[-5px] w-[25px] h-[25px]"
              />
            </div>
            <div>
              <h2 className="font-medium text-lg">
                Vault Name or Strategy Name
              </h2>
              <p className="text-sm text-gray font-light mt-[-2px]">
                Curated by Dew Finance
              </p>
            </div>
          </div>

          <hr className="border-t border-border-color" />

          {/* Input Tabs */}
          <div className="p-6">
            <div className="flex bg-tab-background rounded-sm mb-6 overflow-hidden">
              {(["deposit", "withdraw"] as TMode[]).map((t) => {
                const isLeftActive = actionMode === t;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      vaultActionStore.store.trigger.changeMode({
                        mode: t,
                      });
                    }}
                    className={`relative w-1/2 py-2.5 text-sm capitalize font-medium duration-300 hover:opacity-50 transition`}
                  >
                    {isLeftActive && (
                      <motion.div
                        layoutId="leftActiveTab"
                        className="absolute inset-0 bg-tab-button-background rounded-sm"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                    <span
                      className={`relative z-10 ${
                        isLeftActive ? "text-black font-bold" : "text-gray"
                      }`}
                    >
                      {t}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Animate between Deposit & Withdraw */}
            <AnimatePresence mode="wait">
              {actionMode === "deposit" && (
                <motion.div
                  key="deposit"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {/* Amount Input */}
                  <div className="flex  justify-between items-center mt-5  mb-1.5">
                    <p className="text-sm font-base text-white">Amount </p>
                    <p className="text-sm font-base text-gray">
                      Available: {balance.data?.formatted}
                    </p>
                  </div>
                  <div className="relative  md:max-w-md mt-1">
                    <Input />
                    <Token />
                    <div
                      onClick={() => {
                        if (balance.data) {
                          vaultActionStore.store.trigger.updateAmount({
                            amount: balance.data.formatted,
                          });
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-input-inner-background text-white text-xs px-3 py-1.5 rounded-sm cursor-pointer transition-opacity duration-200 hover:opacity-50"
                    >
                      Max
                    </div>
                  </div>

                  {/* Transaction Overview */}
                  <p className="text-sm mb-2">Transaction Details </p>
                  <div className="bg-card-background rounded-sm p-4 px-5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray">Share</span>
                      <div className="flex gap-1.5 items-center justify-center">
                        <span>1 {assetSymbol}</span>{" "}
                        <img
                          src={assetIcon}
                          alt={assetSymbol}
                          className="w-4 h-4"
                        />
                        <ArrowLeftRight className="text-gray" size={12} />
                        <span>
                          {exchangeRateForSelectedToken}{" "}
                          {vaultShareMetadataQuery.data?.symbol}
                        </span>{" "}
                        <img
                          src={vaultShareMetadataQuery.data?.icon || undefined}
                          alt={vaultShareMetadataQuery.data?.symbol}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray">Slippage Tolerance</span>
                      <span>{slippagePercent}%</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-5">
                    <button
                      onClick={() => {
                        if (!depositToVaultMutation.isPending) {
                          if (
                            intentsAddressQuery.data &&
                            nearAddress &&
                            selectedAsset &&
                            exchangeRateForSelectedToken &&
                            vaultShareMetadataQuery.data &&
                            vaultContractId &&
                            connectedWalletAddress
                          ) {
                            const storeContext =
                              vaultActionStore.store.get().context;
                            depositToVaultMutation.mutate({
                              nearAddress: nearAddress,
                              asset: selectedAsset,
                              intentsDepositAddress:
                                intentsAddressQuery.data.address,
                              amount: storeContext.amount,
                              exchangeRate: exchangeRateForSelectedToken,
                              sharesDecimals:
                                vaultShareMetadataQuery.data?.decimals,
                              vaultContractId: vaultContractId,
                              slippagePercent: storeContext.slippagePercent,
                              chain: selectedChain,
                              blockchainAddress: connectedWalletAddress.address,
                            });
                          }
                        }
                      }}
                      className="flex-1 bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-bold text-base confirm-button-shadow relative"
                    >
                      Confirm
                    </button>
                    <button
                      className="flex-1 bg-secondary transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-normal text-base"
                      onClick={() => {
                        vaultActionStore.store.trigger.openSimulateModal();
                      }}
                    >
                      Simulate
                    </button>
                  </div>
                </motion.div>
              )}

              {actionMode === "withdraw" && (
                <motion.div
                  key="withdraw"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {/* Amount Input */}
                  <div className="flex  justify-between items-center mt-5  mb-1.5">
                    <p className="text-sm font-base text-white">Amount </p>
                    <p className="text-sm font-base text-gray">
                      Available: 10.329
                    </p>
                  </div>
                  <div className="relative  md:max-w-md mt-1">
                    <input
                      type="text"
                      placeholder="0.0"
                      className="w-full pl-28 pr-16 py-3 rounded-sm bg-input-background text-white placeholder-gray-500 text-base outline-hidden focus:ring-2 focus:ring-input-focus focus:border-input-focus transition"
                    />
                    <div className="absolute top-0 h-full flex items-center gap-2 bg-input-inner-background px-4 py-1 select-none pointer-events-none rounded-l-sm min-w-[95px]">
                      <img src={Near} alt={"NEAR"} className="w-6 h-6" />
                      <span className="text-sm text-white font-semibold">
                        NEAR
                      </span>
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-input-inner-background text-white text-xs px-3 py-1.5 rounded-sm cursor-pointer transition-opacity duration-200 hover:opacity-50">
                      Max
                    </div>
                  </div>

                  {/* Transaction Overview */}
                  <p className="text-sm mb-2">Transaction Details </p>
                  <div className="bg-card-background rounded-sm p-4 px-5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray">Share</span>
                      <div className="flex gap-1.5 items-center justify-center">
                        <span>0.0001</span>{" "}
                        <img src={Near} alt={"NEAR"} className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray">Slippage Tolerance</span>
                      <span>1%</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-5">
                    <button className="flex-1 bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-bold text-base confirm-button-shadow relative">
                      Confirm
                    </button>
                    <button
                      className="flex-1 bg-secondary transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-normal text-base"
                      onClick={() => {
                        vaultActionStore.store.trigger.openSimulateModal();
                      }}
                    >
                      Simulate
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Motion>
      {/* Stats */}
      <div className="grid grid-cols-2 mt-3 gap-4">
        <Motion direction="left" duration={0.6} delay={0.5}>
          <div className="flex-1 bg-[linear-gradient(139deg,#000000,#0C0C0C)] p-4 py-5 rounded-md  border border-dark-border-color ">
            <p className="text-sm text-gray">Net APY</p>
            <p className="text-2xl font-semibold text-green">
              <CountUp
                from={0}
                to={parseFloat("18.34")}
                separator=","
                direction="up"
                duration={0.1}
                className="count-up-text"
              />
              %
            </p>
          </div>
        </Motion>
        <Motion direction="left" duration={0.6} delay={0.7}>
          <div className="flex-1 bg-[linear-gradient(139deg,#000000,#0C0C0C)] p-4 py-5 rounded-md  border border-dark-border-color">
            <p className="text-sm text-gray">My Position</p>
            <div className="flex gap-1.5 items-center ">
              <p className="text-2xl font-semibold">100 </p>
              <img src={Near} alt={"NEAR"} className="w-7 h-7" />
            </div>
          </div>
        </Motion>
      </div>
    </div>
  );
}
