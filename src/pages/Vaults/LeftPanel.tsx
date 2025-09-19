import Motion from "../../components/utils/Motion";
import vaultIcon from "../../assets/vault-icon.png";
import Near from "../../assets/near.png";
import { vaultActionStore, type TMode } from "../../stores/vault_action_store";
import { motion, AnimatePresence } from "framer-motion";
import { accountQueries } from "../../queries/account";
import { FLAT_LIST_TOKENS } from "../../intents/constants/tokens";
import { ArrowLeftRight } from "lucide-react";
import CountUp from "../../components/utils/CountUp";
import { useSearchParams } from "react-router-dom";
import { walletStore } from "../../stores/wallet_store";
import { useQuery } from "@tanstack/react-query";
import { vaultQueries, type TAsset } from "../../queries/vault";
import { useEffect, useMemo } from "react";
import _ from "lodash";
import { intentsQueries } from "../../queries/intents";
import { vaultMutations } from "../../mutations/vault";
import Big from "big.js";
import { CircularProgress } from "../../components/utils/CircularProgress";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

const MyPosition = () => {
  const [searchParams] = useSearchParams({
    vaultContractId: "stable-test-1.dew-finance.near",
  });

  const nearAddress = walletStore.selectors.useCurrentNearAccountId();

  const vaultContractId = searchParams.get("vaultContractId");

  const myPositionQuery = useQuery({
    ...vaultQueries.getMyPositionQueryOptions({
      vaultContractId: vaultContractId!,
      nearAddress: nearAddress!,
    }),
    enabled: nearAddress !== null && vaultContractId !== null,
  });

  const vaultShareMetadataQuery = useQuery({
    ...vaultQueries.getVaultShareMetadataQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const myPosition = useMemo(() => {
    if (vaultShareMetadataQuery.data && myPositionQuery.data) {
      return Big(myPositionQuery.data)
        .div(Big(10).pow(vaultShareMetadataQuery.data.decimals))
        .toFixed();
    }

    return "0";
  }, [vaultShareMetadataQuery.data, myPositionQuery.data]);

  return (
    <Motion direction="left" duration={0.6} delay={0.7}>
      <div className="flex-1 bg-[linear-gradient(139deg,#000000,#0C0C0C)] p-4 py-5 rounded-md  border border-dark-border-color">
        <p className="text-sm text-gray">My Position</p>
        <div className="flex gap-1.5 items-center ">
          <p className="text-2xl font-semibold">{myPosition} </p>
          <img
            src={vaultShareMetadataQuery.data?.icon || undefined}
            alt={vaultShareMetadataQuery.data?.symbol}
            className="w-7 h-7"
          />
        </div>
      </div>
    </Motion>
  );
};

const DepositInput = () => {
  const depositAmount = vaultActionStore.selectors.useDepositAmount();
  return (
    <input
      type="text"
      placeholder="0.0"
      className="w-full pl-28 pr-16 py-3 rounded-sm bg-input-background text-white placeholder-gray-500 text-base outline-hidden focus:ring-2 focus:ring-input-focus focus:border-input-focus transition"
      value={depositAmount}
      onChange={(e) =>
        vaultActionStore.store.trigger.updateDepositAmount({
          amount: e.target.value,
        })
      }
    />
  );
};

const WithdrawInput = () => {
  const depositAmount = vaultActionStore.selectors.useWithdrawAmount();
  return (
    <input
      type="text"
      placeholder="0.0"
      className="w-full pl-28 pr-16 py-3 rounded-sm bg-input-background text-white placeholder-gray-500 text-base outline-hidden focus:ring-2 focus:ring-input-focus focus:border-input-focus transition"
      value={depositAmount}
      onChange={(e) =>
        vaultActionStore.store.trigger.updateWithdrawAmount({
          amount: e.target.value,
        })
      }
    />
  );
};

const Token = ({ selectedAsset }: { selectedAsset: TAsset | null }) => {
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

// put as hook here as FungibleToken is very likely to use useQuery
const useAssetSymbolAndIcon = ({ asset }: { asset: TAsset | null }) => {
  let assetSymbol = "";
  let assetIcon = "";
  let assetDecimals: null | number = null;

  if (asset) {
    if ("MultiToken" in asset) {
      const tokenInfo = FLAT_LIST_TOKENS.find(
        (e) => e.defuseAssetId === asset.MultiToken.token_id
      );

      if (tokenInfo) {
        assetSymbol = tokenInfo.symbolWithoutChain;
        assetIcon = tokenInfo.icon;
        assetDecimals = tokenInfo.decimals;
      }
    }
  }

  // TODO: Handle for FungibleToken

  return {
    assetSymbol,
    assetIcon,
    assetDecimals,
  };
};

const useExchangeRateForAsset = ({
  asset,
  vaultContractId,
}: {
  asset: TAsset | null;
  vaultContractId: string | null;
}) => {
  const exchangeRatesQuery = useQuery({
    ...vaultQueries.getAllExchangeRatesQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const vaultConfigQuery = useQuery({
    ...vaultQueries.getVaultConfigQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const exchangeRateForAsset = useMemo(() => {
    if (vaultConfigQuery.data && exchangeRatesQuery.data) {
      const selectedExchangeRateRaw = exchangeRatesQuery.data?.find((e) => {
        const [assetInExchangeRate] = e;
        if (_.isEqual(assetInExchangeRate, asset)) {
          return true;
        }
      });

      const rateDecimals = vaultConfigQuery.data.exchange_rate_decimals;

      if (selectedExchangeRateRaw) {
        const shareToAsset = Big(selectedExchangeRateRaw[1]).div(
          Big(10).pow(rateDecimals)
        );
        const assetToShare = Big(1).div(shareToAsset);

        return {
          assetToShare: assetToShare.toString(),
          shareToAsset: shareToAsset.toString(),
        };
      }
    }
  }, [exchangeRatesQuery.data, asset, vaultConfigQuery.data]);

  return exchangeRateForAsset;
};

type ConfirmButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

const ConfirmButton: React.FC<ConfirmButtonProps> = (props) => {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!props.disabled) {
          if (props.onClick) {
            props.onClick(e);
          }
        }
      }}
      className={
        twMerge([
          "flex justify-center items-center",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          clsx({
            "cursor-progress disabled:cursor-progress": props.isLoading
          }),
          "flex-1 bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-bold text-base confirm-button-shadow relative",
          props.className
        ])
      }
    >
      {props.isLoading ? (
        <div className="mr-1">
          <CircularProgress size="small" />
        </div>
      ) : (
        props.children
      )}
    </button>
  );
};

const DepositTab = () => {
  const [searchParams] = useSearchParams({
    vaultContractId: "stable-test-1.dew-finance.near",
  });

  const vaultContractId = searchParams.get("vaultContractId");
  const selectedChain = walletStore.selectors.useSelectedChain();
  const nearAddress = walletStore.selectors.useCurrentNearAccountId();

  const slippagePercent =
    vaultActionStore.selectors.useDepositSlippagePercent();

  const allAcceptedTokensQuery = useQuery({
    ...vaultQueries.getAllAcceptedTokensQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const selectedDepositAsset =
    vaultActionStore.selectors.useSelectedDepositAsset();

  const balance = accountQueries.useAccountBalance({
    asset: selectedDepositAsset,
  });

  const intentsAddressQuery = useQuery({
    ...intentsQueries.getIntentsAddressQueryOptions({
      chain: selectedChain,
      nearAddress: nearAddress!,
    }),
    enabled: nearAddress !== null,
  });

  const vaultShareMetadataQuery = useQuery({
    ...vaultQueries.getVaultShareMetadataQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const depositToVaultMutation = vaultMutations.useDepositToVaultMutation();

  const connectedWalletAddress =
    walletStore.selectors.useConnectedWalletAddress();

  const { assetIcon, assetSymbol } = useAssetSymbolAndIcon({
    asset: selectedDepositAsset,
  });

  const exchangeRateForSelectedAsset = useExchangeRateForAsset({
    asset: selectedDepositAsset,
    vaultContractId,
  });

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
    vaultActionStore.store.trigger.setInitialSelectedDepositAsset({
      assets: availableTokens,
    });
  }, [availableTokens]);

  return (
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
        <DepositInput />
        <Token selectedAsset={selectedDepositAsset} />

        <div
          onClick={() => {
            if (balance.data) {
              vaultActionStore.store.trigger.updateDepositAmount({
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
            <img src={assetIcon} alt={assetSymbol} className="w-4 h-4" />
            <ArrowLeftRight className="text-gray" size={12} />
            <span>
              {exchangeRateForSelectedAsset?.assetToShare}{" "}
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
        <ConfirmButton
          isLoading={depositToVaultMutation.isPending}
          disabled={depositToVaultMutation.isPending}
          onClick={() => {
            if (!depositToVaultMutation.isPending) {
              if (
                intentsAddressQuery.data &&
                nearAddress &&
                selectedDepositAsset &&
                exchangeRateForSelectedAsset &&
                vaultShareMetadataQuery.data &&
                vaultContractId &&
                connectedWalletAddress
              ) {
                const storeContext = vaultActionStore.store.get().context;
                depositToVaultMutation.mutate({
                  nearAddress: nearAddress,
                  asset: selectedDepositAsset,
                  intentsDepositAddress: intentsAddressQuery.data.address,
                  amount: storeContext.depositAmount,
                  exchangeRate: exchangeRateForSelectedAsset.assetToShare,
                  sharesDecimals: vaultShareMetadataQuery.data?.decimals,
                  vaultContractId: vaultContractId,
                  slippagePercent: storeContext.depositSlippagePercent,
                  chain: selectedChain,
                  blockchainAddress: connectedWalletAddress.address,
                });
              }
            }
          }}
        >
          Confirm
        </ConfirmButton>
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
  );
};

const WithdrawalTab = () => {
  const [searchParams] = useSearchParams({
    vaultContractId: "stable-test-1.dew-finance.near",
  });

  const selectedChain = walletStore.selectors.useSelectedChain();

  const nearAddress = walletStore.selectors.useCurrentNearAccountId();

  const vaultContractId = searchParams.get("vaultContractId");

  const myPositionQuery = useQuery({
    ...vaultQueries.getMyPositionQueryOptions({
      vaultContractId: vaultContractId!,
      nearAddress: nearAddress!,
    }),
    enabled: nearAddress !== null && vaultContractId !== null,
  });

  const vaultShareMetadataQuery = useQuery({
    ...vaultQueries.getVaultShareMetadataQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const selectedWithdrawAsset =
    vaultActionStore.selectors.selectedWithdrawAsset();

  const slippagePercent =
    vaultActionStore.selectors.useWithdrawSlippagePercent();

  const myPosition = useMemo(() => {
    if (vaultShareMetadataQuery.data && myPositionQuery.data) {
      return Big(myPositionQuery.data)
        .div(Big(10).pow(vaultShareMetadataQuery.data.decimals))
        .toFixed();
    }

    return "0";
  }, [vaultShareMetadataQuery.data, myPositionQuery.data]);

  const exchangeRateForAsset = useExchangeRateForAsset({
    vaultContractId,
    asset: selectedWithdrawAsset,
  });

  const balanceInAsset = useMemo(() => {
    if (exchangeRateForAsset) {
      return Big(myPosition).mul(exchangeRateForAsset.shareToAsset).toFixed();
    }
    return "0";
  }, [exchangeRateForAsset, myPosition]);

  const allAcceptedTokensQuery = useQuery({
    ...vaultQueries.getAllAcceptedTokensQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const connectedWalletAddress =
    walletStore.selectors.useConnectedWalletAddress();

  const withdrawFromVaultMutation =
    vaultMutations.useWithdrawFromVaultMutation();

  const { assetDecimals } = useAssetSymbolAndIcon({
    asset: selectedWithdrawAsset,
  });

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
    vaultActionStore.store.trigger.setInitialSelectedWithdrawAsset({
      assets: availableTokens,
    });
  }, [availableTokens]);

  const withdrawAmount = vaultActionStore.selectors.useWithdrawAmount();
  const expectedShareToBeBurnt = useMemo(() => {
    if (exchangeRateForAsset) {
      return Big(withdrawAmount || "0")
        .mul(Big(exchangeRateForAsset.assetToShare))
        .toFixed();
    }
    return "0";
  }, [withdrawAmount, exchangeRateForAsset]);

  return (
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
          Available: {balanceInAsset}
        </p>
      </div>
      <div className="relative  md:max-w-md mt-1">
        <WithdrawInput />
        <Token selectedAsset={selectedWithdrawAsset} />
        <div
          onClick={() => {
            vaultActionStore.store.trigger.updateWithdrawAmount({
              amount: balanceInAsset,
            });
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
            <span>
              {expectedShareToBeBurnt} {vaultShareMetadataQuery.data?.symbol}
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
        <ConfirmButton
          isLoading={withdrawFromVaultMutation.isPending}
          disabled={withdrawFromVaultMutation.isPending}
          onClick={() => {
            if (!withdrawFromVaultMutation.isPending) {
              if (
                nearAddress &&
                selectedWithdrawAsset &&
                exchangeRateForAsset &&
                vaultShareMetadataQuery.data &&
                vaultContractId &&
                connectedWalletAddress &&
                assetDecimals !== null
              ) {
                const storeContext = vaultActionStore.store.get().context;
                withdrawFromVaultMutation.mutate({
                  nearAddress: nearAddress,
                  asset: selectedWithdrawAsset,
                  share: expectedShareToBeBurnt,
                  exchangeRate: exchangeRateForAsset.shareToAsset,
                  shareDecimals: vaultShareMetadataQuery.data?.decimals,
                  vaultContractId: vaultContractId,
                  slippagePercent: storeContext.withdrawSlippagePercent,
                  chain: selectedChain,
                  blockchainAddress: connectedWalletAddress.address,
                  assetDecimals,
                  withdrawToAddress: connectedWalletAddress.address,
                });
              }
            }
          }}
        >
          Confirm
        </ConfirmButton>
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
  );
};

export default function LeftPanel() {
  const actionMode = vaultActionStore.selectors.useMode();

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
              {actionMode === "deposit" && <DepositTab />}

              {actionMode === "withdraw" && <WithdrawalTab />}
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
              {/* <CountUp
                from={0}
                to={parseFloat("18.34")}
                separator=","
                direction="up"
                duration={0.1}
                className="count-up-text"
              /> */}
              -
              %
            </p>
          </div>
        </Motion>
        <MyPosition />
      </div>
    </div>
  );
}
