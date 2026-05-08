import { useQuery } from "@tanstack/react-query";
import { FLAT_LIST_TOKENS } from "../intents/constants/tokens";
import { vaultQueries, type TAsset } from "../queries/vault";
import { useMemo } from "react";
import { isEqual } from "es-toolkit";
import Big from "big.js";

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
        if (isEqual(assetInExchangeRate, asset)) {
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

export const assetUtils = {
  useAssetSymbolAndIcon,
  useExchangeRateForAsset
};
