import { queryOptions } from "@tanstack/react-query";
import { nearUtils } from "../utils/nearUtils";
import z from "zod";

const zAsset = z.union([
  z.object({
    MultiToken: z.object({
      contract_id: z.string(),
      token_id: z.string(),
    }),
  }),
  z.object({
    FungibleToken: z.string(),
  }),
]);

const zExchangeRate = z.array(z.tuple([zAsset, z.string()]));

export type TExchangeRate = z.infer<typeof zExchangeRate>;
export type TAsset = z.infer<typeof zAsset>;

const getAllExchangeRatesQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "allExchangeRates", vaultContractId],
    queryFn: async () => {
      const exchangeRates = await nearUtils.provider.callFunction(
        vaultContractId,
        "get_all_exchange_rates",
        {}
      );

      return zExchangeRate.parse(exchangeRates);
    },
  });
};

const getAllAcceptedTokensQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    ...getAllExchangeRatesQueryOptions({ vaultContractId }),
    select: (data) => {
      return data.map((v) => v[0]);
    },
  });
};

const zVaultConfig = z.object({
  exchange_rate_decimals: z.number(),
});

const getVaultConfig = ({ vaultContractId }: { vaultContractId: string }) => {
  return queryOptions({
    queryKey: ["vault", "vaultConfigs", vaultContractId],
    queryFn: async () => {
      const exchangeRates = await nearUtils.provider.callFunction(
        vaultContractId,
        "get_vault_config",
        {}
      );

      return zVaultConfig.parse(exchangeRates);
    },
  });
};

const zFtMetadata = z.object({
  symbol: z.string(),
  icon: z.string().nullable(),
  decimals: z.number(),
});

const getVaultShareMetadata = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "vaultFtMetadata", vaultContractId],
    queryFn: async () => {
      const ftMetadata = await nearUtils.provider.callFunction(
        vaultContractId,
        "ft_metadata",
        {}
      );

      return zFtMetadata.parse(ftMetadata);
    },
  });
};

const getCheckIsStorageDepositedQueryOptions = ({
  vaultContractId,
  nearAddress,
}: {
  vaultContractId: string;
  nearAddress: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "vaultFtMetadata", vaultContractId],
    queryFn: async () => {
      const storageBalanceOf = (await nearUtils.provider.callFunction(
        vaultContractId,
        "storage_balance_of",
        {
          account_id: nearAddress,
        }
      )) as null | { total: string; available: string };

      if (storageBalanceOf?.available && storageBalanceOf.total) {
        return true;
      }

      return false;
    },
  });
};

export const vaultQueries = {
  getAllAcceptedTokensQueryOptions,
  getAllExchangeRatesQueryOptions,
  getVaultConfig,
  getVaultShareMetadata,
  getCheckIsStorageDepositedQueryOptions,
};
