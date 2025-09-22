import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { nearUtils } from "../utils/nearUtils";
import z from "zod";
import { DewAccountBackend } from "../backend/DewAccountBackend";
import { DewAgentBackend } from "../backend/DewAgentBackend";

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

const getPolicyCountQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "policyCount", { vaultContractId }],
    queryFn: async () => {
      const policyCount = (await nearUtils.provider.callFunction(
        vaultContractId,
        "get_policy_count",
        {}
      )) as number;

      return policyCount;
    },
  });
};

export const zConditionSchema = z.object({
  path: z.string(),
  type: z.enum(["String", "BigInt", "Address"]).or(z.string()),
  eq: z.union([z.string(), z.number(), z.null()]).nullable().optional(),
  ne: z.union([z.string(), z.number(), z.null()]).nullable().optional(),
  gte: z.union([z.string(), z.number(), z.null()]).nullable().optional(),
  lte: z.union([z.string(), z.number(), z.null()]).nullable().optional(),
  gt: z.union([z.string(), z.number(), z.null()]).nullable().optional(),
  lt: z.union([z.string(), z.number(), z.null()]).nullable().optional(),
  nullable: z.union([z.boolean(), z.null()]).optional(),
});

const zRestrictionSchema = z.object({
  method: z.string(),
  contract_id: z.string(),
  schema: z.array(zConditionSchema),
  interface: z.string(),
});

const zPolicyBase = z.object({
  id: z.string(),
  description: z.string(),
  required_role: z.string(),
  required_vote_count: z.union([
    z.number(),
    z.string().regex(/^\d+$/).transform(Number),
  ]),
  policy_status: z.enum(["Active", "Inactive"]),
  activation_time: z.string(),
});

const zVaultConfigurationPolicy = zPolicyBase.extend({
  policy_type: z.literal("VaultConfiguration"),
  policy_details: z.literal("VaultConfiguration"),
});
export const zChainSigTransactionPolicy = zPolicyBase.extend({
  policy_type: z.literal("ChainSigTransaction"),
  policy_details: z.object({
    ChainSigTransaction: z.object({
      derivation_path: z.string(),
      chain_environment: z.string(),
      restrictions: z.array(zRestrictionSchema).default([]),
    }),
  }),
});

export const zChainSigMessagePolicy = zPolicyBase.extend({
  policy_type: z.literal("ChainSigMessage"),
  policy_details: z.object({
    ChainSigMessage: z.object({
      derivation_path: z.string(),
      sign_method: z.union([z.literal("NearIntentsSwap")]),
    }),
  }),
});

export const zNearNativeTransactionPolicy = zPolicyBase.extend({
  policy_type: z.literal("NearNativeTransaction"),
  policy_details: z.object({
    NearNativeTransaction: z.object({
      chain_environment: z.string(),
      restrictions: z.array(zRestrictionSchema).default([]),
    }),
  }),
});

const zPolicy = z.discriminatedUnion("policy_type", [
  zVaultConfigurationPolicy,
  zChainSigTransactionPolicy,
  zChainSigMessagePolicy,
  zNearNativeTransactionPolicy,
]);

export type TPolicy = z.infer<typeof zPolicy>;
export type TPolicyType = TPolicy["policy_type"];
export type TRestrictions = z.infer<typeof zRestrictionSchema>[]

type TNearNativeTransactionPolicy = z.infer<
  typeof zNearNativeTransactionPolicy
>;
type TChainSigTransactionPolicy = z.infer<typeof zChainSigTransactionPolicy>;
export type TRestrictionPolicy =
  | TChainSigTransactionPolicy
  | TNearNativeTransactionPolicy;

const zAllPolicies = z.array(z.tuple([z.string(), zPolicy]));

const getAllPoliciesInfiniteQueryOptions = ({
  vaultContractId,
  limit = 12,
}: {
  vaultContractId: string;
  limit?: number;
}) => {
  return infiniteQueryOptions({
    queryKey: ["vault", "allPolicies", { vaultContractId }],
    queryFn: async ({ pageParam }) => {
      const allPolicies = await nearUtils.provider.callFunction(
        vaultContractId,
        "get_all_policies",
        {
          from_index: pageParam ?? 0,
          limit,
        }
      );

      const policies = zAllPolicies
        .transform((items) => items.map(([_, policy]) => policy))
        .parse(allPolicies);

      return policies;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage || lastPage.length === 0) {
        return undefined;
      }
      return (lastPageParam ?? 0) + limit;
    },
    getPreviousPageParam: (_firstPage, _allPages, firstPageParam) => {
      if (!firstPageParam || firstPageParam <= 0) {
        return undefined;
      }
      return Math.max(0, firstPageParam - limit);
    },
  });
};

const getVaultApyQueryOptions = ({
  vaultContractId,
  variant,
}: {
  vaultContractId: string;
  variant: "1" | "7" | "30";
}) => {
  return queryOptions({
    queryKey: [
      "vault",
      "vaultApy",
      {
        vaultContractId,
        variant,
      },
    ],
    queryFn: async () => {
      const { data } = await DewAccountBackend.getVaultApy({
        variant,
        vaultContractId,
      });

      return data;
    },
  });
};

const getVaultBaseAssetQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "baseAsset", vaultContractId],
    queryFn: async () => {
      const data = (await nearUtils.provider.callFunction(
        vaultContractId,
        "asset",
        {}
      )) as TAsset;

      return data;
    },
  });
};

const getVaultBalanceDistributionQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "vaultBalanceDistribution", vaultContractId],
    queryFn: async () => {
      const { data } = await DewAgentBackend.getCacheBalanceDistribution();
      return data;
    },
  });
};

const getHistoricalSharePriceQueryOptions = ({
  vaultContractId,
  limit,
  numberOf30MinsInterval,
}: {
  vaultContractId: string;
  limit: number;
  numberOf30MinsInterval: "1";
}) => {
  return queryOptions({
    queryKey: [
      "vault",
      "historicalSharePrice",
      { vaultContractId, limit, numberOf30MinsInterval },
    ],
    queryFn: async () => {
      const { data } = await DewAccountBackend.getHistoricalSharePrice({
        vaultContractId,
        limit,
        numberOf30MinsInterval,
      });
      return data;
    },
  });
};

const getHistoricalBalanceQueryOptions = ({
  vaultContractId,
  limit,
  numberOf30MinsInterval,
}: {
  vaultContractId: string;
  limit: number;
  numberOf30MinsInterval: "1";
}) => {
  return queryOptions({
    queryKey: [
      "vault",
      "historicalBalance",
      { vaultContractId, limit, numberOf30MinsInterval },
    ],
    queryFn: async () => {
      const { data } = await DewAccountBackend.getHistoricalBalance({
        vaultContractId,
        limit,
        numberOf30MinsInterval,
      });
      return data;
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
  getPolicyCountQueryOptions,
  getAllPoliciesInfiniteQueryOptions,
  getVaultApyQueryOptions,
  getVaultBaseAssetQueryOptions,
  getVaultBalanceDistributionQueryOptions,
  getHistoricalSharePriceQueryOptions,
  getHistoricalBalanceQueryOptions,
};
