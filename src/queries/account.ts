import { useQuery } from "@tanstack/react-query";
import { useWalletSelector } from "../walletSelector";
import type { TAsset } from "./vault";
import { walletStore } from "../stores/wallet_store";

const useAccountBalance = ({ asset }: { asset: TAsset | null }) => {
  const { getBalance } = useWalletSelector();
  const selectedChain = walletStore.selectors.useSelectedChain();
  const connectedWalletAddress =
    walletStore.selectors.useConnectedWalletAddress();

  return useQuery({
    queryKey: [
      "account",
      "balance",
      {
        asset,
        address: connectedWalletAddress?.address,
        // required to refresh when changing between EVM networks
        selectedChain,
      },
    ],
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
};
