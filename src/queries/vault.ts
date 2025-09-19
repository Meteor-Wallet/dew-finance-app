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
  management_fee_bps: z.number(),
  performance_fee_bps: z.number(),
});

const getVaultConfigQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
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

const getVaultShareMetadataQueryOptions = ({
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
    queryKey: [
      "vault",
      "vaultIsStorageDeposited",
      { vaultContractId, nearAddress },
    ],
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

const getMyPositionQueryOptions = ({
  vaultContractId,
  nearAddress,
}: {
  vaultContractId: string;
  nearAddress: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "myPosition", { vaultContractId, nearAddress }],
    queryFn: async () => {
      const ftBalanceOf = (await nearUtils.provider.callFunction(
        vaultContractId,
        "ft_balance_of",
        {
          account_id: nearAddress,
        }
      )) as string;

      return ftBalanceOf;
    },
  });
};

const getAccountsWithRoleQueryOptions = ({
  vaultContractId,
  roleName,
}: {
  vaultContractId: string;
  roleName: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "accountsWithRole", { vaultContractId, roleName }],
    queryFn: async () => {
      const accountsWithRole = (await nearUtils.provider.callFunction(
        vaultContractId,
        "get_accounts_with_role",
        {
          role_name: roleName,
        }
      )) as string[];

      return accountsWithRole;
    },
  });
};

const zAllRoleAssignments = z.array(
  z.tuple([
    z.union([
      z.object({ AccountId: z.string() }),
      z.object({ Codehash: z.string() }),
    ]),
    z.array(z.string()),
  ])
);

const getAllRoleAssignmentsQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "allRoleAssignments", { vaultContractId }],
    queryFn: async () => {
      const allRoleAssignments = await nearUtils.provider.callFunction(
        vaultContractId,
        "get_all_role_assignments",
        {}
      );

      const rawData = zAllRoleAssignments.parse(allRoleAssignments);
      const map: Record<string, string[]> = {};

      for (const [obj, roles] of rawData) {
        const key = "AccountId" in obj ? obj.AccountId : obj.Codehash;
        for (const role of roles) {
          if (!map[role]) {
            map[role] = [];
          }
          map[role].push(key);
        }
      }

      return Object.entries(map).map(([role, addresses]) => ({
        role,
        addresses,
      }));
    },
  });
};

const zAllAssetDepositFees = z.array(z.tuple([zAsset, z.number()]));
const zProtocolAllAssetDepositCut = z.array(z.tuple([zAsset, z.number()]));
const zAllAssetWithdrawalFees = z.array(z.tuple([zAsset, z.number()]));
const zProtocolAllAssetWithdrawalCut = z.array(z.tuple([zAsset, z.number()]));

const getAllAssetDepositFeesQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "allAssetDepositFees", { vaultContractId }],
    queryFn: async () => {
      const allAssetDepositFees = await nearUtils.provider.callFunction(
        vaultContractId,
        "get_all_asset_deposit_fees",
        {}
      );

      return zAllAssetDepositFees.parse(allAssetDepositFees);
    },
  });
};

const getProtocolAllAssetDepositCutQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "protocolAllAssetDepositCut", { vaultContractId }],
    queryFn: async () => {
      const allAssetDepositCut = await nearUtils.provider.callFunction(
        vaultContractId,
        "protocol_get_all_asset_deposit_cut",
        {}
      );

      return zProtocolAllAssetDepositCut.parse(allAssetDepositCut);
    },
  });
};

const getAllAssetWithdrawalFeesQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "allAssetWithdrawalFees", { vaultContractId }],
    queryFn: async () => {
      const allAssetWithdrawalFees = await nearUtils.provider.callFunction(
        vaultContractId,
        "get_all_asset_withdrawal_fees",
        {}
      );

      return zAllAssetWithdrawalFees.parse(allAssetWithdrawalFees);
    },
  });
};

const getProtocolAllAssetWithdrawalCutQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "protocolAllAssetWithdrawalCut", { vaultContractId }],
    queryFn: async () => {
      const allAssetWithdrawalCut = await nearUtils.provider.callFunction(
        vaultContractId,
        "protocol_get_all_asset_withdrawal_cut",
        {}
      );

      return zProtocolAllAssetWithdrawalCut.parse(allAssetWithdrawalCut);
    },
  });
};

export const vaultQueries = {
  getAllAcceptedTokensQueryOptions,
  getAllExchangeRatesQueryOptions,
  getVaultConfigQueryOptions,
  getVaultShareMetadataQueryOptions,
  getCheckIsStorageDepositedQueryOptions,
  getMyPositionQueryOptions,
  getAccountsWithRoleQueryOptions,
  getAllRoleAssignmentsQueryOptions,
  getAllAssetDepositFeesQueryOptions,
  getProtocolAllAssetDepositCutQueryOptions,
  getAllAssetWithdrawalFeesQueryOptions,
  getProtocolAllAssetWithdrawalCutQueryOptions,
};
