import closeIcon from "../../assets/close.svg";
import Modal from "react-modal";
import { memo, useEffect, useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { useVaultActionStore } from "../../stores/vault_action_store";
import { useWalletStore, useConnectedWalletAddress } from "../../stores/wallet_store";
import { useSearchParams } from "react-router-dom";
import { vaultUtils } from "../../utils/vaultUtils";
import { FLAT_LIST_TOKENS } from "../../intents/constants/tokens";
import { useQuery } from "@tanstack/react-query";
import { vaultQueries, type TAsset } from "../../queries/vault";
import { assetUtils } from "../../utils/assetUtils";
import { stringUtils } from "../../utils/stringUtils";
import { accountQueries } from "../../queries/account";
import { intentsQueries } from "../../queries/intents";
import { vaultMutations } from "../../mutations/vault";
import { CircularProgress } from "../utils/CircularProgress";

const Asset = ({
  onClick,
  asset,
}: {
  asset: TAsset;
  onClick: (asset: TAsset) => void;
}) => {
  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({ asset });
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
      className="w-full pl-28 pr-16 py-3 rounded-sm bg-input-background text-white placeholder-gray-500 text-base outline-hidden focus:ring-2 focus:ring-input-focus focus:border-input-focus transition"
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
    (s) => s.isDepositWalletModalOpen
  );
  const [searchParams] = useSearchParams({
    vaultContractId: vaultUtils.DEFAULT_VAULT_CONTRACT_ID,
  });
  const vaultContractId = searchParams.get("vaultContractId");
  const [open, setOpen] = useState(false);

  const selectedChain = useWalletStore((s) => s.selectedChain);
  const nearAddress = useWalletStore((s) => s.nearAccountId);
  const connectedWalletAddress = useConnectedWalletAddress();

  const selectedAsset = useVaultActionStore((s) => s.selectedDepositAsset);
  const slippagePercent = useVaultActionStore((s) => s.depositSlippagePercent);
  const depositAmount = useVaultActionStore((s) => s.depositAmount);

  const allAcceptedTokensQuery = useQuery({
    ...vaultQueries.getAllAcceptedTokensQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const availableTokens = useMemo(() => {
    return (
      allAcceptedTokensQuery.data?.filter((e) => {
        if ("FungibleToken" in e) {
          if (selectedChain === "near") return true;
        }
        if ("MultiToken" in e) {
          const tokenInfo = FLAT_LIST_TOKENS.find(
            (token) => token.defuseAssetId === e.MultiToken.token_id
          );
          if (tokenInfo?.chainName === selectedChain) return true;
        }
        return false;
      }) || []
    );
  }, [allAcceptedTokensQuery.data, selectedChain]);

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
    vaultContractId,
  });

  const vaultShareMetadataQuery = useQuery({
    ...vaultQueries.getVaultShareMetadataQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const balance = accountQueries.useAccountBalance({ asset: selectedAsset });

  const intentsAddressQuery = useQuery({
    ...intentsQueries.getIntentsAddressQueryOptions({
      chain: selectedChain,
      nearAddress: nearAddress!,
    }),
    enabled: nearAddress !== null,
  });

  const depositToVaultMutation = vaultMutations.useDepositToVaultMutation();

  const canDeposit =
    intentsAddressQuery.data &&
    nearAddress &&
    selectedAsset &&
    exchangeRateForSelectedAsset &&
    vaultShareMetadataQuery.data &&
    vaultContractId &&
    connectedWalletAddress &&
    depositAmount;

  const handleClose = () => {
    if (depositToVaultMutation.isPending) return;
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
          Deposit Into Vault Name
        </h2>
        <hr className="border-t border-border-color mt-6 mb-6" />

        <div className="flex justify-between items-center mt-5 mb-1.5">
          <p className="text-sm font-base text-white">Amount</p>
          <p className="text-sm font-base text-gray">
            Available: {balance.data?.formatted}
          </p>
        </div>

        <div className="relative md:max-w-md mt-1">
          <Input />
          <div
            id="dropdown"
            onClick={() => setOpen(!open)}
            className="absolute top-0 h-full flex items-center gap-2 bg-input-inner-background px-4 py-1 select-none cursor-pointer rounded-l-sm min-w-[95px]"
          >
            <img src={assetIcon} alt={assetSymbol} className="w-6 h-6" />
            <span className="text-sm text-white font-semibold">{assetSymbol}</span>
          </div>
          <div
            onClick={() => {
              if (balance.data) {
                useVaultActionStore
                  .getState()
                  .updateDepositAmount({ amount: balance.data.formatted });
              }
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-input-inner-background text-white text-xs px-3 py-1.5 rounded-sm cursor-pointer transition-opacity duration-200 hover:opacity-50"
          >
            Max
          </div>
          {open && (
            <div className="absolute left-0 top-full mt-1 w-40 bg-input-inner-background rounded-md shadow-lg z-10">
              {availableTokens.map((token) => (
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

        <p className="text-sm mb-2 mt-5">Transaction Details</p>
        <div className="bg-card-background rounded-sm p-4 px-5 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray">Share</span>
            <div className="flex gap-1.5 items-center justify-center">
              <span>1 {assetSymbol}</span>
              <img src={assetIcon} alt={assetSymbol} className="w-5 h-5" />
              <ArrowLeftRight className="text-gray" size={12} />
              <span>
                {stringUtils.truncateDecimals(
                  exchangeRateForSelectedAsset?.assetToShare
                )}{" "}
                {vaultShareMetadataQuery.data?.symbol}
              </span>
              {vaultShareMetadataQuery.data?.icon && (
                <img
                  src={vaultShareMetadataQuery.data.icon}
                  alt={vaultShareMetadataQuery.data.symbol}
                  className="w-5 h-5"
                />
              )}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray">Slippage Tolerance</span>
            <span>{slippagePercent}%</span>
          </div>
        </div>

        <button
          onClick={() => {
            if (!depositToVaultMutation.isPending && canDeposit) {
              const { depositAmount: amount, depositSlippagePercent } =
                useVaultActionStore.getState();
              depositToVaultMutation.mutate({
                nearAddress,
                asset: selectedAsset,
                intentsDepositAddress: intentsAddressQuery.data.address,
                amount,
                exchangeRate: exchangeRateForSelectedAsset.assetToShare,
                sharesDecimals: vaultShareMetadataQuery.data.decimals,
                vaultContractId,
                slippagePercent: depositSlippagePercent,
                chain: selectedChain,
                blockchainAddress: connectedWalletAddress.address,
              });
            }
          }}
          disabled={depositToVaultMutation.isPending || !canDeposit}
          className="disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center w-full bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-bold text-base confirm-button-shadow relative px-6 mt-10 mb-4"
        >
          {depositToVaultMutation.isPending ? (
            <div className="mr-1">
              <CircularProgress size="small" />
            </div>
          ) : (
            "Deposit"
          )}
        </button>

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
