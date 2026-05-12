import Motion from "../../components/utils/Motion";
import { useVaultActionStore } from "../../stores/vault_action_store";
import { accountQueries } from "../../queries/account";
import { FLAT_LIST_TOKENS } from "../../intents/constants/tokens";
import CountUp from "../../components/utils/CountUp";
import { useParams } from "react-router-dom";
import { useWalletStore } from "../../stores/wallet_store";
import { useQuery } from "@tanstack/react-query";
import { vaultQueries, type TAsset } from "../../queries/vault";
import { useMemo } from "react";
import Big from "big.js";
import { CircularProgress } from "../../components/utils/CircularProgress";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { assetUtils } from "../../utils/assetUtils";

const MyPosition2 = () => {
  const { vaultContractId } = useParams<{ vaultContractId: string }>();
  const nearAddress = useWalletStore((s) => s.nearAccountId);

  const myPositionQuery = useQuery({
    ...vaultQueries.getMyPositionQueryOptions({
      vaultContractId: vaultContractId!,
      nearAddress: nearAddress!,
    }),
    enabled: nearAddress !== null && vaultContractId !== undefined,
  });

  const vaultShareMetadataQuery = useQuery({
    ...vaultQueries.getFtMetadataQueryOptions({
      tokenId: vaultContractId!,
    }),
    enabled: vaultContractId !== undefined,
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
      <div className="flex gap-2 items-center">
        {vaultShareMetadataQuery.data?.icon && (
          <img
            src={vaultShareMetadataQuery.data.icon}
            alt={vaultShareMetadataQuery.data.symbol}
            className="w-5 h-6"
          />
        )}
        <p className="text-base font-normal text-gray">
          {vaultShareMetadataQuery.data?.symbol}
        </p>
      </div>
      <p className="text-base font-semibold">{myPosition}</p>
    </div>
  );
};


type ConfirmButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

const ConfirmButton: React.FC<ConfirmButtonProps> = (props) => {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!props.disabled && props.onClick) props.onClick(e);
      }}
      className={twMerge([
        "flex justify-center items-center",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        clsx({ "cursor-progress disabled:cursor-progress": props.isLoading }),
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


const AvailableBalanceRow = ({ asset }: { asset: TAsset }) => {
  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({ asset });
  const balance = accountQueries.useAccountBalance({ asset });

  return (
    <div className="flex justify-between items-center mt-3">
      <div className="flex gap-2 items-center">
        <img src={assetIcon} alt={assetSymbol} className="w-6 h-6" />
        <p className="text-base font-normal text-gray">Available {assetSymbol}</p>
      </div>
      <p className="text-base font-semibold">{balance.data?.formatted ?? "0"}</p>
    </div>
  );
};

const AvailableBalances = () => {
  const { vaultContractId } = useParams<{ vaultContractId: string }>();
  const selectedChain = useWalletStore((s) => s.selectedChain);

  const allAcceptedTokensQuery = useQuery({
    ...vaultQueries.getAllAcceptedTokensQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== undefined,
  });

  const availableTokens = useMemo(() => {
    return (
      allAcceptedTokensQuery.data?.filter((e) => {
        if ("FungibleToken" in e && selectedChain === "near") return true;
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

  return availableTokens.map((v, i) => <AvailableBalanceRow key={i} asset={v} />);
};

export default function LeftPanel() {
  const { vaultContractId } = useParams<{ vaultContractId: string }>();

  const vaultAprQuery = useQuery({
    ...vaultQueries.getVaultAprQueryOptions({
      vaultId: vaultContractId!,
    }),
    enabled: vaultContractId !== undefined,
  });

  const roundedAPY = useMemo(() => {
    if (vaultAprQuery.data) {
      try {
        return Big(vaultAprQuery.data)
          .mul(Big(100))
          .round(2, Big.roundDown)
          .toNumber();
      } catch {
        // ignore Big.js parse error on invalid APR value
      }
    }
    return 0;
  }, [vaultAprQuery.data]);

  return (
    <div className="w-full h-full lg:w-1/3 sticky top-5 lg:order-2 order-1">
      <div className="grid grid-cols-2 gap-4">
        <Motion direction="left" duration={0.6} delay={0.5}>
          <div className="flex-1 bg-[linear-gradient(139deg,#000000,#0C0C0C)] p-4 py-5 rounded-md border border-dark-border-color">
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
      </div>

      <Motion direction="right" duration={0.6} delay={0.6}>
        <div className="w-full bg-[linear-gradient(139deg,#1a1c27,#0D0D0D,#0D0D0D)] border border-border-color rounded-lg shadow-lg mt-5 p-6 lg:pb-6 pb-[60px]">
          <h2 className="font-semibold text-xl">Wallet Balance</h2>
          <AvailableBalances />

          <div className="flex flex-col gap-3 pt-5 mt-2">
            <ConfirmButton
              onClick={() =>
                useVaultActionStore.getState().openDepositWalletModal()
              }
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
              onClick={() =>
                useVaultActionStore.getState().openRedeemWalletModal()
              }
            >
              Redeem
            </button>
          </div>
        </div>
      </Motion>

      <div className="grid grid-cols-2 mt-3 gap-4"></div>
    </div>
  );
}
