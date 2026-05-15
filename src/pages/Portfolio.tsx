import { Navigate, useNavigate } from "react-router-dom";
import { useWalletStore } from "../stores/wallet_store";
import { vaultUtils } from "../utils/vaultUtils";
import { vaultQueries } from "../queries/vault";
import { rheaQueries } from "../queries/rhea";
import { assetUtils } from "../utils/assetUtils";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import Big from "big.js";
import { isEqual } from "es-toolkit";
import vaultIcon from "../assets/vault-icon.png";
import { ChevronRight } from "lucide-react";
import Dew1 from "../assets/dew1.svg";
import Dew2 from "../assets/dew2.svg";
import Motion from "../components/utils/Motion";
import TVL from "../assets/fee_icon3.svg";
import TV from "../assets/fee_icon1.svg";

type TVaultConfig = (typeof vaultUtils.vaults)[number];

function formatUsd(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function getContractId(asset: any): string {
  if ("FungibleToken" in asset) return asset.FungibleToken.contract_id;
  return asset.MultiToken.contract_id;
}

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
            <img
              src={assetIcon}
              className="absolute -bottom-1.25 -right-1.25 w-5.5 h-5.5 rounded-full"
              alt={assetSymbol}
            />
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
        <div className="bg-[linear-gradient(139deg,#000000,#181822)] rounded-lg border border-dark-border-color overflow-hidden mb-12.5">
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
      </Motion>
    </div>
  );
}

export default function Portfolio() {
  const nearAddress = useWalletStore((s) => s.nearAccountId);

  if (!nearAddress) return <Navigate to="/" replace />;

  return <PortfolioContent nearAddress={nearAddress} />;
}
