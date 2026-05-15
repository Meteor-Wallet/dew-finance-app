import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { nearUtils } from "../utils/nearUtils";
import z from "zod";
import { DewAccountBackend } from "../backend/DewAccountBackend";
import { DewAgentBackend } from "../backend/DewAgentBackend";
import { vaultUtils } from "../utils/vaultUtils";
import Big from "big.js";

const zAsset = z.union([
  z.object({
    MultiToken: z.object({
      contract_id: z.string(),
      token_id: z.string(),
    }),
  }),
  z.object({
    FungibleToken: z.object({
      contract_id: z.string(),
    }),
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
        "get_all_share_prices",
        {},
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
  share_price_decimals: z.number(),
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
      const vaultConfig = await nearUtils.provider.callFunction(
        vaultContractId,
        "get_vault_config",
        {},
      );

      return zVaultConfig.parse(vaultConfig);
    },
  });
};

const zFtMetadata = z.object({
  symbol: z.string(),
  icon: z.string().nullable(),
  decimals: z.number(),
});

const getFtMetadataQueryOptions = ({ tokenId }: { tokenId: string }) => {
  return queryOptions({
    queryKey: ["ft_metadata", tokenId],
    queryFn: async () => {
      const ftMetadata = await nearUtils.provider.callFunction(
        tokenId,
        "ft_metadata",
        {},
      );

      return zFtMetadata.parse(ftMetadata);
    },
    staleTime: Infinity,
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
        },
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
        },
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
      const vaultInfo = vaultUtils.vaults.find(
        (e) => e.vault_id === vaultContractId,
      );
      if (!vaultInfo) {
        throw new Error("Vault not found");
      }
      const accountsWithRole = (await nearUtils.provider.callFunction(
        vaultInfo.kernel_id,
        "get_accounts_with_role",
        {
          role_name: roleName,
        },
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
  ]),
);

const getAllRoleAssignmentsQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "allRoleAssignments", { vaultContractId }],
    queryFn: async () => {
      const vaultInfo = vaultUtils.vaults.find(
        (e) => e.vault_id === vaultContractId,
      );
      if (!vaultInfo) {
        throw new Error("Vault not found");
      }
      const allRoleAssignments = await nearUtils.provider.callFunction(
        vaultInfo.kernel_id,
        "get_all_role_assignments",
        {},
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

const getPolicyCountQueryOptions = ({
  vaultContractId,
}: {
  vaultContractId: string;
}) => {
  return queryOptions({
    queryKey: ["vault", "policyCount", { vaultContractId }],
    queryFn: async () => {
      const vaultInfo = vaultUtils.vaults.find(
        (e) => e.vault_id === vaultContractId,
      );
      if (!vaultInfo) {
        throw new Error("Vault not found");
      }
      const policyCount = (await nearUtils.provider.callFunction(
        vaultInfo.kernel_id,
        "get_policy_count",
        {},
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
  go_to_index_if_not_found: z.number().nullable(),
  schema: z.string(),
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
  activation_time: z.string(),
});

const zVaultConfigurationPolicy = zPolicyBase.extend({
  policy_type: z.literal("VaultConfiguration"),
  policy_details: z.literal("VaultConfiguration"),
});
const zKernelConfigurationPolicy = zPolicyBase.extend({
  policy_type: z.literal("KernelConfiguration"),
  policy_details: z.literal("KernelConfiguration"),
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
  zKernelConfigurationPolicy,
]);

export type TPolicy = z.infer<typeof zPolicy>;
export type TPolicyType = TPolicy["policy_type"];
export type TRestrictions = z.infer<typeof zRestrictionSchema>[];

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
      const vaultInfo = vaultUtils.vaults.find(
        (e) => e.vault_id === vaultContractId,
      );
      if (!vaultInfo) {
        throw new Error("Vault not found");
      }
      const allPolicies = await nearUtils.provider.callFunction(
        vaultInfo.kernel_id,
        "get_all_policies",
        {
          from_index: pageParam ?? 0,
          limit,
        },
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
        "get_base_asset",
        {},
      )) as TAsset;

      return data;
    },
  });
};

// TODO: REMOVE
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

const getLatestBlockinfoQueryOptions = () => {
  return queryOptions({
    queryKey: ["blockInfo", "latest"],
    queryFn: async () => {
      const blockInfo = await nearUtils.provider.block({ finality: "final" });
      return blockInfo;
    },
  });
};

const getBlockinfoQueryOptions = (blockId: number) => {
  return queryOptions({
    queryKey: ["blockInfo", blockId],
    queryFn: async () => {
      const blockInfo = await nearUtils.provider.block({ blockId });
      return blockInfo;
    },
    staleTime: Infinity,
  });
};

const getHistoricalSharePriceQueryOptions = ({
  vaultContractId,
  blockId,
  asset,
}: {
  vaultContractId: string;
  blockId?: number;
  asset: TAsset;
}) => {
  return queryOptions({
    queryKey: [
      "vault",
      "historicalSharePrice",
      { vaultContractId, blockId, asset },
    ],
    queryFn: async () => {
      const data = await nearUtils.provider.callFunction(
        vaultContractId,
        "get_all_share_prices",
        {},
        blockId ? { blockId } : undefined,
      );

      const rates = zExchangeRate.parse(data);
      const targetRate = rates.find((rate) => {
        const [rateAsset] = rate;
        if (JSON.stringify(rateAsset) === JSON.stringify(asset)) {
          return true;
        }
        return false;
      });

      if (!targetRate) {
        throw new Error(
          "Share price for the asset not found at the given block",
        );
      }
      return targetRate[1];
    },
    staleTime: Infinity,
  });
};

const getHistoricalBalanceQueryOptions = ({
  vaultContractId,
  blockId,
  asset,
}: {
  vaultContractId: string;
  blockId?: number;
  asset: TAsset;
}) => {
  return queryOptions({
    queryKey: [
      "vault",
      "historicalBalance",
      { vaultContractId, blockId, asset },
    ],
    queryFn: async ({ client }) => {
      const sharePrice = await client.fetchQuery(
        getHistoricalSharePriceQueryOptions({
          vaultContractId,
          blockId,
          asset,
        }),
      );

      const totalShares = await nearUtils.provider.callFunction<string>(
        vaultContractId,
        "ft_total_supply",
        {
          asset,
        },
        blockId ? { blockId } : undefined,
      );

      const vaultConfig = vaultUtils.vaults.find(
        (v) => v.vault_id === vaultContractId,
      );
      if (!vaultConfig) {
        throw new Error("Vault config not found");
      }

      const shareDecimals = vaultConfig.share_deciamls;

      const balance = Big(sharePrice)
        .mul(Big(totalShares || "0").div(Big(10).pow(shareDecimals)))
        .toString();

      return balance;
    },
  });
};

const getAssetBalanceQueryOptions = ({
  vaultId,
  asset,
}: {
  vaultId: string;
  asset: TAsset;
}) => {
  return queryOptions({
    queryKey: ["assetBalance", { vaultId, asset }],
    queryFn: async () => {
      const balance = await nearUtils.provider.callFunction<{
        available_amount: string;
        pending_deposit: string;
      }>(vaultId, "get_asset_balance", {
        asset,
      });

      if (!balance) {
        throw new Error("Failed to fetch asset balance");
      }

      return balance;
    },
  });
};

export const zMeteorApiResponse_Error = z.object({
  ok: z.literal(false),
  error: z.any(),
});

export const zMeteorApiResponse_Ok = z.object({
  ok: z.literal(true),
  value: z.any(),
});

export const zMeteorApiResponseAnyError = z.union([
  zMeteorApiResponse_Error,
  zMeteorApiResponse_Ok,
]);

const getVaultAprQueryOptions = ({ vaultId }: { vaultId: string }) => {
  return queryOptions({
    queryKey: ["vaultApr", vaultId],
    queryFn: async () => {
      const response = await fetch(
        `https://backend-v2.meteorwallet.app/api/dew_vault/get_meteor_savings_apr`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lpTokenId: vaultId,
          }),
        },
      );

      const json = await response.json();

      const structureValidate = zMeteorApiResponseAnyError.safeParse(json);

      if (!structureValidate.success) {
        throw new Error("Invalid response structure");
      }

      if (structureValidate.data.ok) {
        return structureValidate.data.value.apr as string;
      } else {
        throw new Error(
          `API error: ${JSON.stringify(structureValidate.data.error)}`,
        );
      }
    },
  });
};

const zGetAccountPendingRedeemsResponse = z.array(
  z.object({
    operation: z.object({
      Withdraw: z.object({
        asset: z.object({
          FungibleToken: z.object({
            contract_id: z.string(),
          }),
        }),
        shares: z.string(),
        confirmed: z.boolean(),
        confirmed_share_price: z.string().nullable(),
      }),
    }),
    operation_id: z.number(),
  }),
);

const getAccountPendingRedeemsQueryOptions = ({
  vaultId,
  accountId,
}: {
  vaultId: string;
  accountId: string;
}) => {
  return queryOptions({
    queryKey: ["account", "pendingRedeems", { vaultId, accountId }],
    queryFn: async () => {
      const result = await nearUtils.provider.callFunction(
        vaultId,
        "get_account_pending_redeems",
        {
          account_id: accountId,
        },
      );

      const parsed = zGetAccountPendingRedeemsResponse.safeParse(result);

      if (!parsed.success) {
        throw new Error("Invalid response structure for pending redeems");
      }

      return parsed.data;
    },
  });
};

const zGetAccountClaimableAssetsResponse = z.array(
  z.tuple([
    z.object({
      FungibleToken: z.object({
        contract_id: z.string(),
      }),
    }),
    z.string(),
  ]),
);

const getAccountClaimableAssetsQueryOptions = ({
  vaultId,
  accountId,
}: {
  vaultId: string;
  accountId: string;
}) => {
  return queryOptions({
    queryKey: ["account", "claimableAssets", { vaultId, accountId }],
    queryFn: async () => {
      const result = await nearUtils.provider.callFunction(
        vaultId,
        "get_all_claimable_asset_amounts",
        {
          account_id: accountId,
        },
      );

      const parsed = zGetAccountClaimableAssetsResponse.safeParse(result);

      if (!parsed.success) {
        throw new Error("Invalid response structure for claimable assets");
      }

      return parsed.data;
    },
  });
};

export const vaultQueries = {
  getAllAcceptedTokensQueryOptions,
  getAllExchangeRatesQueryOptions,
  getVaultConfigQueryOptions,
  getFtMetadataQueryOptions,
  getCheckIsStorageDepositedQueryOptions,
  getMyPositionQueryOptions,
  getAccountsWithRoleQueryOptions,
  getAllRoleAssignmentsQueryOptions,
  getPolicyCountQueryOptions,
  getAllPoliciesInfiniteQueryOptions,
  getVaultBaseAssetQueryOptions,
  getVaultBalanceDistributionQueryOptions,
  getHistoricalSharePriceQueryOptions,
  getHistoricalBalanceQueryOptions,
  getLatestBlockinfoQueryOptions,
  getBlockinfoQueryOptions,
  getAssetBalanceQueryOptions,
  getVaultAprQueryOptions,
  getAccountPendingRedeemsQueryOptions,
  getAccountClaimableAssetsQueryOptions,
};
