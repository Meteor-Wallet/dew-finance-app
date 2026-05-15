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
        let balance = await nearUtils.provider.callFunction<string>(
          asset.FungibleToken.contract_id,
          "ft_balance_of",
          {
            account_id: connectedWalletAddress?.address,
          },
        );

        if (!balance) {
          throw new Error("Failed to fetch ft balance");
        }

        if(asset.FungibleToken.contract_id === 'wrap.near'){
          const account = await nearUtils.provider.viewAccount(connectedWalletAddress!.address);
          // reserve 0.25 NEAR for storage and basic gas fees
          const availableBalance = Big(account.amount.toString()).minus(
            Big("0.25").mul(Big(10).pow(24))
          );

          if(availableBalance.gte(Big(0))){
            balance = Big(balance).add(availableBalance).toFixed()
          }
        }

        const ftMetadata = await client.fetchQuery(
          vaultQueries.getFtMetadataQueryOptions({
            tokenId: asset.FungibleToken.contract_id,
          }),
        );

        return {
          balance,
          decimals: ftMetadata.decimals,
          formatted: Big(balance)
            .div(Big(10).pow(ftMetadata.decimals))
            .toFixed(),
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
