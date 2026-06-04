import Motion from "../../components/utils/Motion";
import { useVaultActionStore } from "../../stores/vault_action_store";
import { accountQueries } from "../../queries/account";
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
import { vaultUtils } from "../../utils/vaultUtils";
import { vaultMutations } from "../../mutations/vault";

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

type TMergedPendingRedeem = {
  asset: { FungibleToken: { contract_id: string } };
  // sum of (shares * confirmed_share_price) for confirmed items
  // divide by 10^(shareDecimals + sharePriceDecimals) to get human-readable asset amount
  rawAssetNumerator: string | null;
  allConfirmed: boolean;
};

const PendingRedeemBanner = ({
  merged,
  shareDecimals,
  sharePriceDecimals,
}: {
  merged: TMergedPendingRedeem;
  shareDecimals: number;
  sharePriceDecimals: number;
}) => {
  const { asset, rawAssetNumerator, allConfirmed } = merged;

  const { assetIcon, assetSymbol, assetDecimals } = assetUtils.useAssetSymbolAndIcon({ asset });

  const amountFormatted = useMemo(() => {
    if (!rawAssetNumerator || assetDecimals === null) return "—";
    try {
      return Big(rawAssetNumerator)
        .div(Big(10).pow(shareDecimals + sharePriceDecimals))
        .round(assetDecimals, Big.roundDown)
        .toFixed();
    } catch {
      return "—";
    }
  }, [rawAssetNumerator, shareDecimals, sharePriceDecimals, assetDecimals]);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-sm text-sm ${allConfirmed ? "bg-green/10 border border-green/30 text-green" : "bg-amber-950/60 border border-amber-600/50 text-amber-400"}`}>
      <span className="shrink-0 mt-0.5">⏳</span>
      <div className="flex flex-col gap-0.5">
        <span>
          {allConfirmed ? "Your redeem of" : "Awaiting confirmation for"}{" "}
          <span className="font-semibold">{amountFormatted}</span>{" "}
          <img src={assetIcon} alt={assetSymbol} className="inline w-4 h-4 mx-0.5 align-middle" />
          <span className="font-semibold">{assetSymbol}</span>{" "}
          {allConfirmed ? "is being processed by the vault." : "is pending."}
        </span>
        {allConfirmed && (
          <span className="opacity-70">The vault is processing your confirmed redeem. Funds will be claimable shortly.</span>
        )}
      </div>
    </div>
  );
};

const ClaimableAssetBanner = ({
  asset,
  rawAmount,
  vaultContractId,
  nearAddress,
}: {
  asset: { FungibleToken: { contract_id: string } };
  rawAmount: string;
  vaultContractId: string;
  nearAddress: string;
}) => {
  const { assetIcon, assetSymbol, assetDecimals } = assetUtils.useAssetSymbolAndIcon({ asset });
  const claimMutation = vaultMutations.useClaimClaimableAssetsMutation();

  const amountFormatted = useMemo(() => {
    if (assetDecimals === null) return "—";
    try {
      return Big(rawAmount)
        .div(Big(10).pow(assetDecimals))
        .round(assetDecimals, Big.roundDown)
        .toFixed();
    } catch {
      return "—";
    }
  }, [rawAmount, assetDecimals]);

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-sm text-sm bg-blue-950/60 border border-blue-500/50 text-blue-300">
      <span className="shrink-0 mt-0.5">💰</span>
      <div className="flex flex-col gap-1 flex-1">
        <span>
          <span className="font-semibold">{amountFormatted}</span>{" "}
          <img src={assetIcon} alt={assetSymbol} className="inline w-4 h-4 mx-0.5 align-middle" />
          <span className="font-semibold">{assetSymbol}</span>{" "}
          is ready to claim.
        </span>
        <span className="opacity-70">Your redeemed funds are available. Claim them from the vault.</span>
        <button
          disabled={claimMutation.isPending}
          onClick={() => claimMutation.mutate({ vaultId: vaultContractId, accountId: nearAddress, asset })}
          className="mt-2 self-start px-5 py-1.5 bg-secondary transition-opacity duration-200 hover:opacity-50 rounded-sm font-normal text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claimMutation.isPending ? "Claiming…" : "Claim"}
        </button>
      </div>
    </div>
  );
};

const ClaimableAssets = () => {
  const { vaultContractId } = useParams<{ vaultContractId: string }>();
  const nearAddress = useWalletStore((s) => s.nearAccountId);

  const claimableAssetsQuery = useQuery({
    ...vaultQueries.getAccountClaimableAssetsQueryOptions({
      vaultId: vaultContractId!,
      accountId: nearAddress!,
    }),
    enabled: vaultContractId !== undefined && nearAddress !== null,
  });

  const claimableItems = useMemo(() => {
    return (claimableAssetsQuery.data ?? []).filter(([, rawAmount]) => {
      try {
        return Big(rawAmount).gt(0);
      } catch {
        return false;
      }
    });
  }, [claimableAssetsQuery.data]);

  if (claimableItems.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {claimableItems.map(([asset, rawAmount]) => (
        <ClaimableAssetBanner
          key={asset.FungibleToken.contract_id}
          asset={asset}
          rawAmount={rawAmount}
          vaultContractId={vaultContractId!}
          nearAddress={nearAddress!}
        />
      ))}
    </div>
  );
};

const PendingRedeems = () => {
  const { vaultContractId } = useParams<{ vaultContractId: string }>();
  const nearAddress = useWalletStore((s) => s.nearAccountId);

  const pendingRedeemsQuery = useQuery({
    ...vaultQueries.getAccountPendingRedeemsQueryOptions({
      vaultId: vaultContractId!,
      accountId: nearAddress!,
    }),
    enabled: vaultContractId !== undefined && nearAddress !== null,
  });

  const vaultShareMetadataQuery = useQuery({
    ...vaultQueries.getFtMetadataQueryOptions({ tokenId: vaultContractId! }),
    enabled: vaultContractId !== undefined,
  });

  const sharePriceDecimals = useMemo(
    () => vaultUtils.vaults.find((v) => v.vault_id === vaultContractId)?.share_price_decimals ?? 0,
    [vaultContractId],
  );

  const mergedByAsset = useMemo((): TMergedPendingRedeem[] => {
    const items = pendingRedeemsQuery.data;
    if (!items) return [];
    const map = new Map<string, TMergedPendingRedeem>();
    for (const item of items) {
      const { asset, shares, confirmed, confirmed_share_price } = item.operation.Withdraw;
      const contractId = asset.FungibleToken.contract_id;
      const existing = map.get(contractId);
      const contribution =
        confirmed && confirmed_share_price
          ? Big(shares).mul(Big(confirmed_share_price)).toFixed()
          : null;
      if (existing) {
        existing.allConfirmed = existing.allConfirmed && confirmed;
        if (existing.rawAssetNumerator !== null && contribution !== null) {
          existing.rawAssetNumerator = Big(existing.rawAssetNumerator).add(contribution).toFixed();
        } else {
          existing.rawAssetNumerator = null;
        }
      } else {
        map.set(contractId, { asset, rawAssetNumerator: contribution, allConfirmed: confirmed });
      }
    }
    return Array.from(map.values());
  }, [pendingRedeemsQuery.data]);

  if (mergedByAsset.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {mergedByAsset.map((merged) => (
        <PendingRedeemBanner
          key={merged.asset.FungibleToken.contract_id}
          merged={merged}
          shareDecimals={vaultShareMetadataQuery.data?.decimals ?? 0}
          sharePriceDecimals={sharePriceDecimals}
        />
      ))}
    </div>
  );
};

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
        .round(6, Big.roundDown)
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

const AvailableBalanceRow = ({ asset }: { asset: TAsset }) => {
  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset,
  });
  const balance = accountQueries.useAccountBalance({ asset });

  const formattedBalance = useMemo(() => {
    const raw = balance.data?.formatted;
    if (!raw) return "0";
    try {
      return Big(raw).round(6, Big.roundDown).toFixed();
    } catch {
      return raw;
    }
  }, [balance.data?.formatted]);

  return (
    <div className="flex justify-between items-center mt-3">
      <div className="flex gap-2 items-center">
        <img src={assetIcon} alt={assetSymbol} className="w-6 h-6" />
        <p className="text-base font-normal text-gray">
          Available {assetSymbol}
        </p>
      </div>
      <p className="text-base font-semibold">
        {formattedBalance}
      </p>
    </div>
  );
};

const AvailableBalances = () => {
  const { vaultContractId } = useParams<{ vaultContractId: string }>();
  const allAcceptedTokensQuery = useQuery({
    ...vaultQueries.getAllAcceptedTokensQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== undefined,
  });

  const availableTokens = useMemo(() => {
    return (
      allAcceptedTokensQuery.data?.filter((e) => {
        if ("FungibleToken" in e) {
          return !vaultUtils.DEPRECATED_TOKENS.includes(e.FungibleToken.contract_id);
        }
        return "MultiToken" in e;
      }) ?? []
    );
  }, [allAcceptedTokensQuery.data]);

  return availableTokens.map((v, i) => (
    <AvailableBalanceRow key={i} asset={v} />
  ));
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
    <div className="w-full h-full lg:w-1/3 lg:sticky top-5 lg:order-2 order-1">
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

      <Motion direction="right" duration={0.6} delay={0.7}>
        <ClaimableAssets />
        <PendingRedeems />
      </Motion>

      <div className="grid grid-cols-2 mt-3 gap-4"></div>
    </div>
  );
}
