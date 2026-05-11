import Dew1 from "../assets/dew1.svg";
import Dew2 from "../assets/dew2.svg";
import Hero from "../assets/hero.svg";
import { ChevronRight } from "lucide-react";
import TV from "../assets/fee_icon1.svg";
import TVL from "../assets/fee_icon3.svg";
import vaultIcon from "../assets/vault-icon.png";
import { vaultUtils } from "../utils/vaultUtils";
import { vaultQueries } from "../queries/vault";
import { rheaQueries } from "../queries/rhea";
import { assetUtils } from "../utils/assetUtils";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import Big from "big.js";
import type { TAsset } from "../queries/vault";

type TVaultConfig = (typeof vaultUtils.vaults)[number];
type TTokenPrices = Record<string, { price: string; symbol: string; decimal: number }>;

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function getContractId(asset: TAsset): string {
  if ("FungibleToken" in asset) return asset.FungibleToken.contract_id;
  return asset.MultiToken.contract_id;
}

function computeUsdTvl(
  rawBalance: string,
  asset: TAsset,
  sharePriceDecimals: number,
  tokenPrices: TTokenPrices,
): number | null {
  const contractId = getContractId(asset);
  const priceInfo = tokenPrices[contractId];
  if (!priceInfo) return null;
  return Big(rawBalance)
    .div(Big(10).pow(sharePriceDecimals))
    .mul(Big(priceInfo.price))
    .toNumber();
}

const VaultRow = ({ vault }: { vault: TVaultConfig }) => {
  const navigate = useNavigate();
  const tokenPricesQuery = useQuery(rheaQueries.getTokenPrices());

  const baseAssetQuery = useQuery({
    ...vaultQueries.getVaultBaseAssetQueryOptions({ vaultContractId: vault.vault_id }),
  });

  const balanceQuery = useQuery({
    ...vaultQueries.getHistoricalBalanceQueryOptions({
      vaultContractId: vault.vault_id,
      asset: baseAssetQuery.data!,
    }),
    enabled: baseAssetQuery.data !== undefined,
  });

  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset: baseAssetQuery.data ?? null,
  });

  const tvlUsdDisplay = useMemo(() => {
    if (!balanceQuery.data || !tokenPricesQuery.data || !baseAssetQuery.data) return "—";
    const usd = computeUsdTvl(
      balanceQuery.data,
      baseAssetQuery.data,
      vault.share_price_decimals,
      tokenPricesQuery.data,
    );
    return usd !== null ? formatUsd(usd) : "—";
  }, [balanceQuery.data, tokenPricesQuery.data, baseAssetQuery.data, vault.share_price_decimals]);

  return (
    <tr
      onClick={() => navigate(`/${vault.vault_id}`)}
      className="hover:bg-[#1A1A1A] transition text-base cursor-pointer"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-[40px] h-[40px] relative">
            <img src={vaultIcon} alt="vault" />
            <img
              src={assetIcon}
              className="absolute bottom-[-5px] right-[-5px] w-[22px] h-[22px] rounded-full"
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
          <img src={assetIcon} className="w-[25px] h-[25px]" alt={assetSymbol} />
          <span className="text-base font-normal">{assetSymbol}</span>
        </div>
      </td>

      <td className="px-6 py-4 font-medium text-green text-base">1%</td>

      <td className="px-6 py-4 text-base font-normal">{tvlUsdDisplay}</td>

      <td className="px-6 py-4">
        <button className="bg-[#1A1E22] rounded-full w-[25px] h-[25px] flex justify-center items-center">
          <ChevronRight className="text-gray-400" size={15} />
        </button>
      </td>
    </tr>
  );
};

export default function Homepage() {
  const tokenPricesQuery = useQuery(rheaQueries.getTokenPrices());

  const baseAssetQueries = useQueries({
    queries: vaultUtils.vaults.map((v) =>
      vaultQueries.getVaultBaseAssetQueryOptions({ vaultContractId: v.vault_id }),
    ),
  });

  const balanceQueries = useQueries({
    queries: vaultUtils.vaults.map((v, i) => ({
      ...vaultQueries.getHistoricalBalanceQueryOptions({
        vaultContractId: v.vault_id,
        asset: baseAssetQueries[i].data!,
      }),
      enabled: baseAssetQueries[i].data !== undefined,
    })),
  });

  const totalTvlUsd = useMemo(() => {
    if (!tokenPricesQuery.data) return undefined;
    let total = Big(0);
    for (let i = 0; i < vaultUtils.vaults.length; i++) {
      const vault = vaultUtils.vaults[i];
      const balance = balanceQueries[i].data;
      const asset = baseAssetQueries[i].data;
      if (!balance || !asset) continue;
      const usd = computeUsdTvl(balance, asset, vault.share_price_decimals, tokenPricesQuery.data);
      if (usd !== null) total = total.add(usd);
    }
    return total.toNumber();
  }, [tokenPricesQuery.data, baseAssetQueries, balanceQueries]);

  return (
    <div className="mt-[50px]">
      <img src={Dew2} className="absolute top-[50vh] left-[-80px] w-[30px] dew-float" />
      <img src={Dew1} className="absolute top-[90vh] right-[-40px] w-[10px] dew-float2" />

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 bg-[linear-gradient(139deg,#000000,#0C0C0C)] rounded-lg shadow-lg border border-dark-border-color relative flex flex-col justify-between overflow-hidden min-h-[300px]">
          <div>
            <div className="absolute w-full h-full left-0 top-0 z-1 p-10">
              <h1 className="text-3xl font-medium mb-2 max-w-[60%]">
                Build on Dew, Access Any Chain, Any Strategy
              </h1>
              <p className="text-gray text-base mb-6">
                Institutional vaults for any token, any chain, any action.
              </p>
            </div>
            <img src={Hero} className="absolute right-0 bottom-0 z-0" />
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-6">
          <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-6 py-8 rounded-md border border-dark-border-color flex justify-between">
            <div>
              <p className="text-lg text-gray">Total Vaults</p>
              <p className="text-4xl font-semibold">{vaultUtils.vaults.length}</p>
            </div>
            <img src={TV} className="h-[65px]" />
          </div>

          <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-6 py-8 rounded-md border border-dark-border-color flex justify-between">
            <div>
              <p className="text-lg text-gray">Total Value Locked</p>
              <p className="text-4xl font-semibold">
                {totalTvlUsd !== undefined ? formatUsd(totalTvlUsd) : "—"}
              </p>
            </div>
            <img src={TVL} className="h-[65px]" />
          </div>
        </div>
      </div>

      {/* Vaults Table */}
      <div className="mt-10 bg-[linear-gradient(139deg,#000000,#181822)] rounded-lg border border-dark-border-color overflow-hidden mb-[50px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0F0F0F] border-b border-dark-border-color text-gray text-sm">
            <tr>
              <th className="px-6 py-4 font-normal">Vaults / Strategy Name</th>
              <th className="px-6 py-4 font-normal">Benchmark Assets</th>
              <th className="px-6 py-4 font-normal">Net APY</th>
              <th className="px-6 py-4 font-normal">TVL</th>
              <th className="px-6 py-4 font-normal"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border-color">
            {vaultUtils.vaults.map((vault) => (
              <VaultRow key={vault.vault_id} vault={vault} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
