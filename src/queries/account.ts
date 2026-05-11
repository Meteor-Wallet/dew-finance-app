import { useQuery } from "@tanstack/react-query";
import { vaultQueries, type TAsset } from "./vault";
import { useConnectedWalletAddress } from "../stores/wallet_store";
import { nearUtils } from "../utils/nearUtils";
import Big from "big.js";

const accountBalanceQueryKey = ({
  asset,
  address,
}: {
  asset: TAsset | null;
  address?: string;
}) => {
  return [
    "account",
    "balance",
    {
      asset,
      address: address,
    },
  ];
};

const useAccountBalance = ({ asset }: { asset: TAsset | null }) => {
  const connectedWalletAddress = useConnectedWalletAddress();

  console.log("Fetching balance for asset:", asset);
      console.log("Connected wallet address:", connectedWalletAddress);

  return useQuery({
    queryKey: accountBalanceQueryKey({
      asset,
      address: connectedWalletAddress?.address,
    }),
    queryFn: async ({ client }) => {
      console.log("Fetching balance for asset:", asset);
      console.log("Connected wallet address:", connectedWalletAddress);
      if (asset && "FungibleToken" in asset) {
        const balance = await nearUtils.provider.callFunction<string>(
          asset.FungibleToken.contract_id,
          "ft_balance_of",
          {
            account_id: connectedWalletAddress?.address,
          },
        );

        if (!balance) {
          throw new Error("Failed to fetch ft balance");
        }

        const ftMetadata = await client.fetchQuery(
          vaultQueries.getVaultShareMetadataQueryOptions({
            vaultContractId: asset.FungibleToken.contract_id,
          }),
        );

        return {
          balance,
          decimals: ftMetadata.decimals,
          formatted: Big(balance)
            .div(Big(10).pow(ftMetadata.decimals))
            .toString(),
        };
      }
    },
    enabled: connectedWalletAddress !== null && asset !== null,
  });
};

export const accountQueries = {
  useAccountBalance,
  queryKey: {
    accountBalanceQueryKey,
  },
};
