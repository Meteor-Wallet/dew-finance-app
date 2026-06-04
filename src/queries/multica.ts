import { queryOptions } from "@tanstack/react-query";
import { nearUtils } from "../utils/nearUtils";

type TEvmWallet = {
  EVM: string;
};

type TSolanaWallet = {
  Solana: string;
};

type TWallet = TEvmWallet | TSolanaWallet;

const getListWalletsByMcaQueryOptions = ({ mca }: { mca: string }) => {
  return queryOptions({
    queryKey: [
      "multica",
      "listWalletsByMca",
      {
        mca,
      },
    ],
    queryFn: async () => {
      const result = await nearUtils.provider.callFunction<TWallet[]>(
        "multica.near",
        "list_wallets_by_mca",
        {
          mca_id: mca,
        },
      );

      return result;
    },
  });
};

export const multicaQueries = {
  getListWalletsByMcaQueryOptions,
};
