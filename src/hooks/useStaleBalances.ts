import { useQueries } from "@tanstack/react-query";
import Big from "big.js";
import { vaultQueries } from "../queries/vault";
import { vaultUtils } from "../utils/vaultUtils";
import { useWalletStore } from "../stores/wallet_store";

export type StaleBalance = {
  contractId: string;
  vaultName: string;
  balanceRaw: string;
  balanceFormatted: string;
  symbol: string;
  icon: string | null;
  decimals: number;
};

export function useStaleBalances(): { data: StaleBalance[]; isLoading: boolean } {
  const nearAccountId = useWalletStore((s) => s.nearAccountId);

  const baseAssetQueries = useQueries({
    queries: vaultUtils.vaults.filter(vault => vault.chains.length > 1).map((vault) => ({
      ...vaultQueries.getVaultBaseAssetQueryOptions({ vaultContractId: vault.vault_id }),
      enabled: !!nearAccountId,
    })),
  });

  const resolvedTokens = vaultUtils.vaults
    .filter(vault => vault.chains.length > 1)
    .map((vault, i) => {
      const asset = baseAssetQueries[i]?.data;
      if (!asset || !("FungibleToken" in asset)) return null;
      return { contractId: asset.FungibleToken.contract_id, vaultName: vault.name };
    })
    .filter((t): t is { contractId: string; vaultName: string } => t !== null);

  const balanceQueries = useQueries({
    queries: resolvedTokens.map(({ contractId }) => ({
      ...vaultQueries.getFtBalanceQueryOptions({ contractId, accountId: nearAccountId! }),
      enabled: !!nearAccountId,
      refetchInterval: 30_000,
    })),
  });

  const metadataQueries = useQueries({
    queries: resolvedTokens.map(({ contractId }) =>
      vaultQueries.getFtMetadataQueryOptions({ tokenId: contractId }),
    ),
  });

  const baseAssetsLoading = baseAssetQueries.some((q) => q.isLoading);
  const isLoading =
    baseAssetsLoading ||
    balanceQueries.some((q) => q.isLoading) ||
    metadataQueries.some((q) => q.isLoading);

  const data: StaleBalance[] = resolvedTokens
    .map(({ contractId, vaultName }, i) => {
      const balance = balanceQueries[i]?.data;
      const meta = metadataQueries[i]?.data;
      if (!balance || !meta) return null;
      try {
        if (Big(balance).lte(0)) return null;
      } catch {
        return null;
      }
      return {
        contractId,
        vaultName,
        balanceRaw: balance,
        balanceFormatted: Big(balance).div(Big(10).pow(meta.decimals)).toFixed(),
        symbol: meta.symbol,
        icon: meta.icon,
        decimals: meta.decimals,
      };
    })
    .filter((t): t is StaleBalance => t !== null);

  return { data, isLoading };
}
