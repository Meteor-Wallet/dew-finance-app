import { FLAT_LIST_TOKENS } from "../intents/constants/tokens";
import type { TAsset } from "../queries/vault";

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

export const assetUtils = {
  useAssetSymbolAndIcon,
};
