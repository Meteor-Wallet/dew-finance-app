import { queryOptions } from "@tanstack/react-query";
import { dewFactoryUtils } from "../utils/dewFactoryUtils";
import type { ChainName } from "../stores/wallet_store";

const abstractAccountsByWalletQueryOptions = ({
  blockchainAddress,
  chain,
}: {
  blockchainAddress: string | null | undefined;
  chain: ChainName | null | undefined;
}) =>
  queryOptions({
    queryKey: ["abstractAccountsByWallet", blockchainAddress, chain],
    queryFn: () =>
      dewFactoryUtils.getAbstractAccountsByWallet({
        blockchainAddress: blockchainAddress!,
        chain: chain!,
      }),
    enabled: !!blockchainAddress && !!chain && chain !== "near",
  });

const walletsByAbstractAccountQueryOptions = ({
  nearAccountId,
}: {
  nearAccountId: string | null | undefined;
}) =>
  queryOptions({
    queryKey: ["walletsByAbstractAccount", nearAccountId],
    queryFn: () =>
      dewFactoryUtils.getWalletsByAbstractAccount({
        nearAccountId: nearAccountId!,
      }),
    enabled: !!nearAccountId,
  });

export const dewAccountQueries = {
  abstractAccountsByWalletQueryOptions,
  walletsByAbstractAccountQueryOptions,
};
