import { Navigate, useNavigate } from "react-router-dom";
import { useWalletStore } from "../stores/wallet_store";
import { vaultUtils } from "../utils/vaultUtils";
import { vaultQueries, type TAsset } from "../queries/vault";
import { rheaQueries } from "../queries/rhea";
import { assetUtils } from "../utils/assetUtils";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Big from "big.js";
import { isEqual } from "es-toolkit";
import vaultIcon from "../assets/vault-icon.png";
import { ChevronRight } from "lucide-react";
import Dew1 from "../assets/dew1.svg";
import Dew2 from "../assets/dew2.svg";
import Motion from "../components/utils/Motion";
import TVL from "../assets/fee_icon3.svg";
import TV from "../assets/fee_icon1.svg";
import { vaultMutations } from "../mutations/vault";
import { dewFactoryUtils } from "../utils/dewFactoryUtils";
import ClaimModal from "../components/modal/ClaimModal";

type TVaultConfig = (typeof vaultUtils.vaults)[number];

type TMergedPendingRedeem = {
  asset: { FungibleToken: { contract_id: string } };
  rawAssetNumerator: string | null;
  allConfirmed: boolean;
};

const PortfolioPendingRedeemBanner = ({
  merged,
  shareDecimals,
  sharePriceDecimals,
  vaultName,
  vaultId,
}: {
  merged: TMergedPendingRedeem;
  shareDecimals: number;
  sharePriceDecimals: number;
  vaultName: string;
  vaultId: string;
}) => {
  const navigate = useNavigate();
  const { assetIcon, assetSymbol, assetDecimals } = assetUtils.useAssetSymbolAndIcon({ asset: merged.asset });

  const amountFormatted = useMemo(() => {
    if (!merged.rawAssetNumerator || assetDecimals === null) return "—";
    try {
      return Big(merged.rawAssetNumerator)
        .div(Big(10).pow(shareDecimals + sharePriceDecimals))
        .round(Math.min(6, assetDecimals), Big.roundDown)
        .toFixed();
    } catch {
      return "—";
    }
  }, [merged.rawAssetNumerator, shareDecimals, sharePriceDecimals, assetDecimals]);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-sm text-sm ${merged.allConfirmed ? "bg-green/10 border border-green/30 text-green" : "bg-amber-950/60 border border-amber-600/50 text-amber-400"}`}>
      <span className="shrink-0 mt-0.5">⏳</span>
      <div className="flex flex-col gap-0.5 flex-1">
        <div className="flex items-start justify-between gap-3">
          <span>
            {merged.allConfirmed ? "Your redeem of" : "Awaiting confirmation for"}{" "}
            <span className="font-semibold">{amountFormatted}</span>{" "}
            <img src={assetIcon} alt={assetSymbol} className="inline w-4 h-4 mx-0.5 align-middle" />
            <span className="font-semibold">{assetSymbol}</span>{" "}
            {merged.allConfirmed ? "is being processed by the vault." : "is pending."}
          </span>
          <button
            onClick={() => navigate(`/${vaultId}`)}
            className="shrink-0 text-xs opacity-60 hover:opacity-100 underline underline-offset-2 whitespace-nowrap"
          >
            {vaultName}
          </button>
        </div>
        {merged.allConfirmed && (
          <span className="opacity-70">The vault is processing your confirmed redeem. Funds will be claimable shortly.</span>
        )}
      </div>
    </div>
  );
};

const PendingRedeemsSection = ({ nearAddress }: { nearAddress: string }) => {
  const pendingRedeemsQueries = useQueries({
    queries: vaultUtils.vaults.map((v) =>
      vaultQueries.getAccountPendingRedeemsQueryOptions({ vaultId: v.vault_id, accountId: nearAddress }),
    ),
  });

  const shareMetadataQueries = useQueries({
    queries: vaultUtils.vaults.map((v) =>
      vaultQueries.getFtMetadataQueryOptions({ tokenId: v.vault_id }),
    ),
  });

  const rows = useMemo(() => {
    return vaultUtils.vaults.flatMap((vault, i) => {
      const items = pendingRedeemsQueries[i].data;
      if (!items || items.length === 0) return [];

      const sharePriceDecimals = vault.share_price_decimals ?? 0;
      const shareDecimals = shareMetadataQueries[i].data?.decimals ?? 0;

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

      return Array.from(map.values()).map((merged) => ({
        key: `${vault.vault_id}-${merged.asset.FungibleToken.contract_id}`,
        vault,
        merged,
        shareDecimals,
        sharePriceDecimals,
      }));
    });
  }, [pendingRedeemsQueries, shareMetadataQueries]);

  if (rows.length === 0) return null;

  return (
    <Motion direction="left" duration={0.6} delay={0.5}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Pending Redeems</h2>
        <div className="space-y-2">
          {rows.map(({ key, vault, merged, shareDecimals, sharePriceDecimals }) => (
            <PortfolioPendingRedeemBanner
              key={key}
              merged={merged}
              shareDecimals={shareDecimals}
              sharePriceDecimals={sharePriceDecimals}
              vaultName={vault.name}
              vaultId={vault.vault_id}
            />
          ))}
        </div>
      </div>
    </Motion>
  );
};

const PortfolioClaimableAssetBanner = ({
  asset,
  rawAmount,
  vaultId,
  nearAddress,
  vaultName,
  onOpenClaimModal,
}: {
  asset: { FungibleToken: { contract_id: string } };
  rawAmount: string;
  vaultId: string;
  nearAddress: string;
  vaultName: string;
  onOpenClaimModal: () => void;
}) => {
  const { assetIcon, assetSymbol, assetDecimals } = assetUtils.useAssetSymbolAndIcon({ asset });
  const claimMutation = vaultMutations.useClaimClaimableAssetsMutation();

  const amountFormatted = useMemo(() => {
    if (assetDecimals === null) return "—";
    try {
      return Big(rawAmount).div(Big(10).pow(assetDecimals)).round(Math.min(6, assetDecimals), Big.roundDown).toFixed();
    } catch {
      return "—";
    }
  }, [rawAmount, assetDecimals]);

  const usingAbstractAccount = dewFactoryUtils.isAbstractAccount(nearAddress);

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-sm text-sm bg-blue-950/60 border border-blue-500/50 text-blue-300">
      <span className="shrink-0 mt-0.5">💰</span>
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-start justify-between gap-3">
          <span>
            <span className="font-semibold">{amountFormatted}</span>{" "}
            <img src={assetIcon} alt={assetSymbol} className="inline w-4 h-4 mx-0.5 align-middle" />
            <span className="font-semibold">{assetSymbol}</span>{" "}
            is ready to claim from <span className="font-medium">{vaultName}</span>.
          </span>
          <button
            disabled={claimMutation.isPending}
            onClick={() => {
              if (usingAbstractAccount) {
                onOpenClaimModal();
              } else {
                claimMutation.mutate({ vaultId, accountId: nearAddress, asset, usingAbstractAccount: false });
              }
            }}
            className="shrink-0 px-4 py-1 bg-secondary transition-opacity duration-200 hover:opacity-50 rounded-sm font-normal text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claimMutation.isPending ? "Claiming…" : "Claim"}
          </button>
        </div>
        <span className="opacity-70">Your redeemed funds are available. Claim them from the vault.</span>
      </div>
    </div>
  );
};

const ClaimableAssetsSection = ({ nearAddress }: { nearAddress: string }) => {
  const [claimModalItem, setClaimModalItem] = useState<{ asset: TAsset; rawAmount: string; vaultId: string } | null>(null);

  const claimableQueries = useQueries({
    queries: vaultUtils.vaults.map((v) =>
      vaultQueries.getAccountClaimableAssetsQueryOptions({ vaultId: v.vault_id, accountId: nearAddress }),
    ),
  });

  const items = useMemo(() => {
    return vaultUtils.vaults.flatMap((vault, i) => {
      const data = claimableQueries[i].data;
      if (!data) return [];
      return data
        .filter(([, rawAmount]) => {
          try { return Big(rawAmount).gt(0); } catch { return false; }
        })
        .map(([asset, rawAmount]) => ({
          key: `${vault.vault_id}-${asset.FungibleToken.contract_id}`,
          vault,
          asset,
          rawAmount,
        }));
    });
  }, [claimableQueries]);

  if (items.length === 0 && !claimModalItem) return null;

  return (
    <>
      {items.length > 0 && (
        <Motion direction="left" duration={0.6} delay={0.55}>
          <div className="mb-12.5">
            <h2 className="text-xl font-semibold mb-3">Ready to Claim</h2>
            <div className="space-y-2">
              {items.map(({ key, vault, asset, rawAmount }) => (
                <PortfolioClaimableAssetBanner
                  key={key}
                  asset={asset}
                  rawAmount={rawAmount}
                  vaultId={vault.vault_id}
                  nearAddress={nearAddress}
                  vaultName={vault.name}
                  onOpenClaimModal={() => setClaimModalItem({ asset, rawAmount, vaultId: vault.vault_id })}
                />
              ))}
            </div>
          </div>
        </Motion>
      )}
      {claimModalItem && (
        <ClaimModal
          isOpen={true}
          onClose={() => setClaimModalItem(null)}
          asset={claimModalItem.asset}
          rawAmount={claimModalItem.rawAmount}
          vaultId={claimModalItem.vaultId}
          nearAddress={nearAddress}
        />
      )}
    </>
  );
};

function formatUsd(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function getContractId(asset: TAsset): string {
  if ("FungibleToken" in asset) return asset.FungibleToken.contract_id;
  return asset.MultiToken.contract_id;
}

const VaultPositionCard = ({
  vault,
  rawPosition,
  usdValue,
  dailyEarningsUsd,
}: {
  vault: TVaultConfig;
  rawPosition: string;
  usdValue: number | null;
  dailyEarningsUsd: number | null;
}) => {
  const navigate = useNavigate();

  const shareMetadataQuery = useQuery({
    ...vaultQueries.getFtMetadataQueryOptions({ tokenId: vault.vault_id }),
  });

  const baseAssetQuery = useQuery({
    ...vaultQueries.getVaultBaseAssetQueryOptions({ vaultContractId: vault.vault_id }),
  });

  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset: baseAssetQuery.data ?? null,
  });

  const shareBalance = useMemo(() => {
    if (!shareMetadataQuery.data) return "—";
    try {
      return Big(rawPosition).div(Big(10).pow(shareMetadataQuery.data.decimals)).round(6, Big.roundDown).toFixed();
    } catch {
      return "—";
    }
  }, [rawPosition, shareMetadataQuery.data]);

  const dailyEarningsDisplay = useMemo(() => {
    if (dailyEarningsUsd === null) return null;
    const formatted = formatUsd(Math.abs(dailyEarningsUsd));
    const isPositive = dailyEarningsUsd >= 0;
    return { formatted: `${isPositive ? "+" : "-"}${formatted}`, isPositive };
  }, [dailyEarningsUsd]);

  return (
    <div
      onClick={() => navigate(`/${vault.vault_id}`)}
      className="bg-[linear-gradient(139deg,#000000,#181822)] border border-dark-border-color rounded-lg p-4 flex items-center justify-between cursor-pointer active:opacity-70 transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 relative shrink-0">
          <img src={vaultIcon} alt="vault" />
          <div className="absolute -bottom-1.25 -right-1.25 w-5.5 h-5.5 rounded-full bg-black flex items-center justify-center">
            <img src={assetIcon} className="w-full h-full rounded-full" alt={assetSymbol} />
          </div>
        </div>
        <div>
          <p className="font-normal text-sm">{vault.name}</p>
          <p className="text-xs text-gray font-normal">Curated by {vault.curated_by}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2">
        <div className="flex items-center gap-1.5">
          {shareMetadataQuery.data?.icon && (
            <img src={shareMetadataQuery.data.icon} className="w-4 h-4" alt={shareMetadataQuery.data.symbol} />
          )}
          <span className="font-semibold text-sm">{shareBalance}</span>
        </div>
        <span className="text-xs text-gray">
          {shareMetadataQuery.data?.symbol ?? "—"}
          {usdValue !== null && ` · ${formatUsd(usdValue)}`}
        </span>
        {dailyEarningsDisplay && (
          <span className={`text-xs font-medium mt-0.5 ${dailyEarningsDisplay.isPositive ? "text-green" : "text-red-400"}`}>
            {dailyEarningsDisplay.formatted}/day
          </span>
        )}
      </div>
    </div>
  );
};

const VaultPositionRow = ({
  vault,
  rawPosition,
  usdValue,
  dailyEarningsUsd,
}: {
  vault: TVaultConfig;
  nearAddress: string;
  rawPosition: string;
  usdValue: number | null;
  dailyEarningsUsd: number | null;
}) => {
  const navigate = useNavigate();

  const shareMetadataQuery = useQuery({
    ...vaultQueries.getFtMetadataQueryOptions({ tokenId: vault.vault_id }),
  });

  const baseAssetQuery = useQuery({
    ...vaultQueries.getVaultBaseAssetQueryOptions({ vaultContractId: vault.vault_id }),
  });

  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset: baseAssetQuery.data ?? null,
  });

  const shareBalance = useMemo(() => {
    if (!shareMetadataQuery.data) return "—";
    try {
      return Big(rawPosition)
        .div(Big(10).pow(shareMetadataQuery.data.decimals))
        .round(6, Big.roundDown)
        .toFixed();
    } catch {
      return "—";
    }
  }, [rawPosition, shareMetadataQuery.data]);

  const dailyEarningsDisplay = useMemo(() => {
    if (dailyEarningsUsd === null) return null;
    const formatted = formatUsd(Math.abs(dailyEarningsUsd));
    const isPositive = dailyEarningsUsd >= 0;
    return { formatted: `${isPositive ? "+" : "-"}${formatted}`, isPositive };
  }, [dailyEarningsUsd]);

  return (
    <tr
      onClick={() => navigate(`/${vault.vault_id}`)}
      className="hover:bg-tab-background transition text-base cursor-pointer"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 relative">
            <img src={vaultIcon} alt="vault" />
            <div className="absolute -bottom-1.25 -right-1.25 w-5.5 h-5.5 rounded-full bg-black flex items-center justify-center">
              <img src={assetIcon} className="w-full h-full rounded-full" alt={assetSymbol} />
            </div>
          </div>
          <div>
            <p className="font-normal text-base">{vault.name}</p>
            <p className="text-xs text-gray font-normal">Curated by {vault.curated_by}</p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {shareMetadataQuery.data?.icon && (
            <img
              src={shareMetadataQuery.data.icon}
              className="w-6.25 h-6.25"
              alt={shareMetadataQuery.data.symbol}
            />
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-base">{shareBalance}</span>
            <span className="text-xs text-gray font-normal">
              {shareMetadataQuery.data?.symbol ?? "—"}
              {usdValue !== null && <span className="ml-1">· {formatUsd(usdValue)}</span>}
            </span>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 font-medium text-base">
        {dailyEarningsDisplay ? (
          <span className={dailyEarningsDisplay.isPositive ? "text-green" : "text-red-400"}>
            {dailyEarningsDisplay.formatted}
          </span>
        ) : (
          "—"
        )}
      </td>

      <td className="px-6 py-4">
        <button className="bg-[#1A1E22] rounded-full w-6.25 h-6.25 flex justify-center items-center">
          <ChevronRight className="text-gray-400" size={15} />
        </button>
      </td>
    </tr>
  );
};

function PortfolioContent({ nearAddress }: { nearAddress: string }) {
  const positionQueries = useQueries({
    queries: vaultUtils.vaults.map((v) =>
      vaultQueries.getMyPositionQueryOptions({ vaultContractId: v.vault_id, nearAddress }),
    ),
  });

  const exchangeRateQueries = useQueries({
    queries: vaultUtils.vaults.map((v) =>
      vaultQueries.getAllExchangeRatesQueryOptions({ vaultContractId: v.vault_id }),
    ),
  });

  const baseAssetQueries = useQueries({
    queries: vaultUtils.vaults.map((v) =>
      vaultQueries.getVaultBaseAssetQueryOptions({ vaultContractId: v.vault_id }),
    ),
  });

  const aprQueries = useQueries({
    queries: vaultUtils.vaults.map((v) =>
      vaultQueries.getVaultAprQueryOptions({ vaultId: v.vault_id }),
    ),
  });

  const tokenPricesQuery = useQuery(rheaQueries.getTokenPrices());

  const allSettled = positionQueries.every((q) => !q.isPending);

  const vaultsWithPosition = useMemo(() => {
    return vaultUtils.vaults
      .map((vault, i) => {
        const rawPosition = positionQueries[i].data;
        if (!rawPosition) return null;
        try {
          if (!Big(rawPosition).gt(0)) return null;
        } catch {
          return null;
        }

        const exchangeRates = exchangeRateQueries[i].data;
        const baseAsset = baseAssetQueries[i].data;
        const apr = aprQueries[i].data;

        let usdValue: number | null = null;
        let dailyEarningsUsd: number | null = null;

        if (exchangeRates && baseAsset && tokenPricesQuery.data) {
          try {
            const rateEntry = exchangeRates.find(([a]) => isEqual(a, baseAsset));
            if (rateEntry) {
              const shareToAsset = Big(rateEntry[1]).div(Big(10).pow(vault.share_price_decimals));
              const userShares = Big(rawPosition).div(Big(10).pow(vault.share_deciamls));
              const contractId = getContractId(baseAsset);
              const priceInfo = tokenPricesQuery.data[contractId];

              if (priceInfo) {
                usdValue = userShares.mul(shareToAsset).mul(Big(priceInfo.price)).toNumber();

                if (apr) {
                  dailyEarningsUsd = Big(usdValue).mul(Big(apr)).div(365).toNumber();
                }
              }
            }
          } catch {
            // leave null
          }
        }

        return { vault, rawPosition, usdValue, dailyEarningsUsd };
      })
      .filter(Boolean) as {
        vault: TVaultConfig;
        rawPosition: string;
        usdValue: number | null;
        dailyEarningsUsd: number | null;
      }[];
  }, [positionQueries, exchangeRateQueries, baseAssetQueries, aprQueries, tokenPricesQuery.data]);

  const totalUsdValue = useMemo(() => {
    const values = vaultsWithPosition.map((d) => d.usdValue).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0);
  }, [vaultsWithPosition]);

  const totalDailyEarnings = useMemo(() => {
    const values = vaultsWithPosition
      .map((d) => d.dailyEarningsUsd)
      .filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0);
  }, [vaultsWithPosition]);

  return (
    <div className="mt-12.5">
      <img src={Dew2} className="absolute top-[50vh] -left-20 w-7.5 dew-float" />
      <img src={Dew1} className="absolute top-[90vh] -right-10 w-2.5 dew-float2" />

      <Motion direction="left" duration={0.6} delay={0.2}>
        <h1 className="text-3xl font-semibold mb-2">My Portfolio</h1>
        <p className="text-gray text-base mb-8">Vaults you have deposited into</p>
      </Motion>

      <Motion direction="left" duration={0.6} delay={0.3}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-xl">
          <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-6 py-8 rounded-md border border-dark-border-color flex justify-between">
            <div>
              <p className="text-lg text-gray">Total Deposited</p>
              <p className="text-4xl font-semibold">
                {totalUsdValue !== null ? formatUsd(totalUsdValue) : "—"}
              </p>
            </div>
            <img src={TVL} className="h-16" />
          </div>

          <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-6 py-8 rounded-md border border-dark-border-color flex justify-between">
            <div>
              <p className="text-lg text-gray">Daily Earnings</p>
              <p
                className={`text-4xl font-semibold ${
                  totalDailyEarnings === null
                    ? ""
                    : totalDailyEarnings >= 0
                    ? "text-green"
                    : "text-red-400"
                }`}
              >
                {totalDailyEarnings !== null
                  ? `${totalDailyEarnings >= 0 ? "+" : "-"}${formatUsd(Math.abs(totalDailyEarnings))}`
                  : "—"}
              </p>
            </div>
            <img src={TV} className="h-16" />
          </div>
        </div>
      </Motion>

      <Motion direction="left" duration={0.6} delay={0.4}>
        {/* Desktop table */}
        <div className="hidden md:block bg-[linear-gradient(139deg,#000000,#181822)] rounded-lg border border-dark-border-color overflow-hidden mb-6">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0F0F0F] border-b border-dark-border-color text-gray text-sm">
              <tr>
                <th className="px-6 py-4 font-normal">Vault</th>
                <th className="px-6 py-4 font-normal">My Balance</th>
                <th className="px-6 py-4 font-normal">Daily Earnings</th>
                <th className="px-6 py-4 font-normal"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border-color">
              {!allSettled && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray text-sm">
                    Loading positions…
                  </td>
                </tr>
              )}
              {allSettled && vaultsWithPosition.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray text-sm">
                    You have no positions in any vault yet.
                  </td>
                </tr>
              )}
              {allSettled &&
                vaultsWithPosition.map(({ vault, rawPosition, usdValue, dailyEarningsUsd }) => (
                  <VaultPositionRow
                    key={vault.vault_id}
                    vault={vault}
                    nearAddress={nearAddress}
                    rawPosition={rawPosition}
                    usdValue={usdValue}
                    dailyEarningsUsd={dailyEarningsUsd}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3 mb-6">
          {!allSettled && (
            <p className="text-center text-gray text-sm py-6">Loading positions…</p>
          )}
          {allSettled && vaultsWithPosition.length === 0 && (
            <p className="text-center text-gray text-sm py-6">You have no positions in any vault yet.</p>
          )}
          {allSettled &&
            vaultsWithPosition.map(({ vault, rawPosition, usdValue, dailyEarningsUsd }) => (
              <VaultPositionCard
                key={vault.vault_id}
                vault={vault}
                rawPosition={rawPosition}
                usdValue={usdValue}
                dailyEarningsUsd={dailyEarningsUsd}
              />
            ))}
        </div>
      </Motion>

      <PendingRedeemsSection nearAddress={nearAddress} />
      <ClaimableAssetsSection nearAddress={nearAddress} />
    </div>
  );
}

export default function Portfolio() {
  const nearAddress = useWalletStore((s) => s.nearAccountId);

  if (!nearAddress) return <Navigate to="/" replace />;

  return <PortfolioContent nearAddress={nearAddress} />;
}
