import { useQuery } from "@tanstack/react-query";
import { useWalletSelector } from "../walletSelector";
import type { TAsset } from "./vault";
import { walletStore, type ChainName } from "../stores/wallet_store";

const accountBalanceQueryKey = ({
  asset,
  address,
  selectedChain,
}: {
  asset: TAsset | null;
  address?: string;
  selectedChain: ChainName;
}) => {
  return [
    "account",
    "balance",
    {
      asset,
      address: address,
      // required to refresh when changing between EVM networks
      selectedChain,
    },
  ];
};

const useAccountBalance = ({ asset }: { asset: TAsset | null }) => {
  const { getBalance } = useWalletSelector();
  const selectedChain = walletStore.selectors.useSelectedChain();
  const connectedWalletAddress =
    walletStore.selectors.useConnectedWalletAddress();

  return useQuery({
    queryKey: accountBalanceQueryKey({
      asset,
      address: connectedWalletAddress?.address,
      // required to refresh when changing between EVM networks
      selectedChain,
    }),
    queryFn: async () => {
      return getBalance({
        address: connectedWalletAddress?.address!,
        asset: asset!,
      });
    },
    enabled: connectedWalletAddress !== null && asset !== null,
  });
};

export const accountQueries = {
  useAccountBalance,
  queryKey: {
    accountBalanceQueryKey
  }
};
