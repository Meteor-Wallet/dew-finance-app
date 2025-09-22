import Motion from "../../components/utils/Motion";
import { vaultActionStore} from "../../stores/vault_action_store";
import { motion } from "framer-motion";
import { accountQueries } from "../../queries/account";
import { FLAT_LIST_TOKENS } from "../../intents/constants/tokens";
import { ArrowLeftRight } from "lucide-react";
import CountUp from "../../components/utils/CountUp";
import { useRive } from "@rive-app/react-canvas";
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
import { vaultUtils } from "../../utils/vaultUtils";
import { stringUtils } from "../../utils/stringUtils";
import { assetUtils } from "../../utils/assetUtils";

const MyPosition2 = () => {
  const [searchParams] = useSearchParams({
    vaultContractId: vaultUtils.DEFAULT_VAULT_CONTRACT_ID,
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
    <div className="flex justify-between items-center mt-3">
      <div className="flex gap-2 items-center ">
        {vaultShareMetadataQuery.data?.icon && (
          <img
            src={vaultShareMetadataQuery.data?.icon || undefined}
            alt={vaultShareMetadataQuery.data?.symbol}
            className="w-5 h-6"
          />
        )}
        <p className="text-base font-normal text-gray">
          {" "}
          {vaultShareMetadataQuery.data?.symbol}
        </p>
      </div>
      <p className="text-base font-semibold">{myPosition}</p>
    </div>
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
      className={twMerge([
        "flex justify-center items-center",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        clsx({
          "cursor-progress disabled:cursor-progress": props.isLoading,
        }),
        "flex-1 bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-bold text-base confirm-button-shadow relative",
        props.className,
      ])}
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
    vaultContractId: vaultUtils.DEFAULT_VAULT_CONTRACT_ID,
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

  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset: selectedDepositAsset,
  });

  const exchangeRateForSelectedAsset = useExchangeRateForAsset({
    asset: selectedDepositAsset,
    vaultContractId,
  });

  const availableTokens = useMemo(() => {
    return (
      allAcceptedTokensQuery.data?.filter((e) => {
        if ("FungibleToken" in e) {
          // FungibleToken is definitely coming from NEAR
          if (selectedChain === "near") {
            return true;
          }
        }

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

  const depositAmount = vaultActionStore.selectors.useDepositAmount();

  const canDeposit =
    intentsAddressQuery.data &&
    nearAddress &&
    selectedDepositAsset &&
    exchangeRateForSelectedAsset &&
    vaultShareMetadataQuery.data &&
    vaultContractId &&
    connectedWalletAddress &&
    depositAmount;

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
              {stringUtils.truncateDecimals(
                exchangeRateForSelectedAsset?.assetToShare
              )}{" "}
              {vaultShareMetadataQuery.data?.symbol}
            </span>{" "}
            {vaultShareMetadataQuery.data?.icon && (
              <img
                src={vaultShareMetadataQuery.data?.icon || undefined}
                alt={vaultShareMetadataQuery.data?.symbol}
                className="w-4 h-4"
              />
            )}
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
          disabled={depositToVaultMutation.isPending || !canDeposit}
          onClick={() => {
            if (!depositToVaultMutation.isPending) {
              if (canDeposit) {
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
        {/* <button
          className="flex-1 bg-secondary transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-normal text-base"
          onClick={() => {
            vaultActionStore.store.trigger.openSimulateModal();
          }}
        >
          Simulate
        </button> */}
      </div>
    </motion.div>
  );
};

const WithdrawalTab = () => {
  const [searchParams] = useSearchParams({
    vaultContractId: vaultUtils.DEFAULT_VAULT_CONTRACT_ID,
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

  const { assetDecimals } = assetUtils.useAssetSymbolAndIcon({
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

  const canDeposit =
    nearAddress &&
    selectedWithdrawAsset &&
    exchangeRateForAsset &&
    vaultShareMetadataQuery.data &&
    vaultContractId &&
    connectedWalletAddress &&
    assetDecimals !== null &&
    withdrawAmount;

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
              {stringUtils.truncateDecimals(expectedShareToBeBurnt)}{" "}
              {vaultShareMetadataQuery.data?.symbol}
            </span>{" "}
            {vaultShareMetadataQuery.data?.icon && (
              <img
                src={vaultShareMetadataQuery.data?.icon || undefined}
                alt={vaultShareMetadataQuery.data?.symbol}
                className="w-4 h-4"
              />
            )}
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
          disabled={withdrawFromVaultMutation.isPending || !canDeposit}
          onClick={() => {
            if (!withdrawFromVaultMutation.isPending) {
              if (canDeposit) {
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
        {/* <button
          className="flex-1 bg-secondary transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-normal text-base"
          onClick={() => {
            vaultActionStore.store.trigger.openSimulateModal();
          }}
        >
          Simulate
        </button> */}
      </div>
    </motion.div>
  );
};

const AvailableBalanceRow = ({ asset }: { asset: TAsset }) => {
  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset: asset,
  });

  const balance = accountQueries.useAccountBalance({
    asset: asset,
  });

  return (
    <div className="flex justify-between items-center mt-3">
      <div className="flex gap-2 items-center ">
        <img src={assetIcon} alt={assetSymbol} className="w-6 h-6" />
        <p className="text-base font-normal text-gray">
          {" "}
          Available {assetSymbol}
        </p>
      </div>
      <p className="text-base font-semibold">
        {balance.data?.formatted ?? "0"}
      </p>
    </div>
  );
};

const AvailableBalances = () => {
  const [searchParams] = useSearchParams({
    vaultContractId: vaultUtils.DEFAULT_VAULT_CONTRACT_ID,
  });

  const vaultContractId = searchParams.get("vaultContractId");

  const allAcceptedTokensQuery = useQuery({
    ...vaultQueries.getAllAcceptedTokensQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const selectedChain = walletStore.selectors.useSelectedChain();

  const availableTokens = useMemo(() => {
    return (
      allAcceptedTokensQuery.data?.filter((e) => {
        if ("FungibleToken" in e) {
          // FungibleToken is definitely coming from NEAR
          if (selectedChain === "near") {
            return true;
          }
        }

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

  return availableTokens.map((v) => {
    return <AvailableBalanceRow asset={v} />;
  });
};

export default function LeftPanel() {
  const actionMode = vaultActionStore.selectors.useMode();

  const { RiveComponent } = useRive({
    src: "/rive/position.riv",
    autoplay: true,
    stateMachines: "State Machine 1",
  });
  const [searchParams] = useSearchParams({
    vaultContractId: vaultUtils.DEFAULT_VAULT_CONTRACT_ID,
  });

  const vaultContractId = searchParams.get("vaultContractId");

  const baseAssetQuery = useQuery({
    ...vaultQueries.getVaultBaseAssetQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const { assetIcon } = assetUtils.useAssetSymbolAndIcon({
    asset: baseAssetQuery.data || null,
  });

  const vaultApyQuery = useQuery({
    ...vaultQueries.getVaultApyQueryOptions({
      variant: "1",
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const roundedAPY = useMemo(() => {
    if (vaultApyQuery.data) {
      try {
        return Big(vaultApyQuery.data)
          .mul(Big(100))
          .round(2, Big.roundDown)
          .toNumber();
      } catch (err) {}
    }

    return 0;
  }, [vaultApyQuery.data]);

  return (
    <div className="w-full h-full lg:w-1/3 sticky top-5 lg:order-2 order-1 ">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Motion direction="left" duration={0.6} delay={0.5}>
          <div className="flex-1 bg-[linear-gradient(139deg,#000000,#0C0C0C)] p-4 py-5 rounded-md  border border-dark-border-color ">
            <p className="text-sm text-gray">Net APY</p>
            <p className="text-3xl font-semibold text-green">
              <CountUp
                from={0}
                to={roundedAPY}
                separator=","
                direction="up"
                duration={0.1}
                className="count-up-text"
              />
              %
            </p>
          </div>
        </Motion>
        {/* <Motion direction="right" duration={0.6} delay={0.9}>
          <div className="flex-1 bg-[linear-gradient(139deg,#000000,#0C0C0C)] p-4 py-5 rounded-md  border border-dark-border-color ">
            <p className="text-sm text-gray">Total Deposited</p>
            <p className="text-3xl font-semibold text-white">$135.42M</p>
          </div>
        </Motion> */}
      </div>

      {/* Input Section */}
      <Motion direction="right" duration={0.6} delay={0.6}>
        <div className="w-full bg-[linear-gradient(139deg,#1a1c27,#0D0D0D,#0D0D0D)]  border border-border-color rounded-lg shadow-lg mt-5 p-6  lg:pb-6 pb-[60px]">
          <h2 className="font-semibold text-xl">Wallet Balance</h2>
          <AvailableBalances />

          <div className="flex flex-col gap-3 pt-5 mt-2">
            {/* <ConfirmButton>
              Connect Wallet
            </ConfirmButton> */}
            <ConfirmButton
              onClick={() => {
                vaultActionStore.store.trigger.openDepositWalletModal();
              }}
            >
              Deposit Into Vault
            </ConfirmButton>
          </div>

          <hr className="border-t border-border-color mt-6 mb-6" />
          <h2 className="font-semibold text-xl">My Position</h2>
          <MyPosition2 />
          <div className="flex gap-3 pt-5 mt-2">
            <button
              className="flex-1 bg-secondary transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-normal text-base"
              onClick={() => {
                vaultActionStore.store.trigger.openRedeemWalletModal();
              }}
            >
              Redeem
            </button>
          </div>
        </div>
        {/* <div className="w-full bg-[linear-gradient(139deg,#1a1c27,#0D0D0D,#0D0D0D)]  border border-border-color rounded-lg shadow-lg mt-5">

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
                      className={`relative z-10 ${isLeftActive ? "text-black font-bold" : "text-gray"
                        }`}
                    >
                      {t}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {actionMode === "deposit" && <DepositTab />}

              {actionMode === "withdraw" && <WithdrawalTab />}
            </AnimatePresence>
          </div>
        </div> */}
      </Motion>

      {/* Stats */}
      <div className="grid grid-cols-2 mt-3 gap-4">
        {/* <Motion direction="left" duration={0.6} delay={0.5}>
          <div className="flex-1 bg-[linear-gradient(139deg,#000000,#0C0C0C)] p-4 py-5 rounded-md  border border-dark-border-color ">
            <p className="text-sm text-gray">Net APY</p>
            <p className="text-2xl font-semibold text-green">
              <CountUp
                from={0}
                to={roundedAPY}
                separator=","
                direction="up"
                duration={0.1}
                className="count-up-text"
              />
              %
            </p>
          </div>
        </Motion> */}
      </div>
    </div>
  );
}
