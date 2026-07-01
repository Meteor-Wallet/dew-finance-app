import {
  type TPolicy,
  type TPolicyType,
  type TRestrictionPolicy,
  type TRestrictions,
} from "../queries/vault";
import type { ChainName } from "../stores/wallet_store";

function isPolicyOfType<Type extends TPolicyType>(
  type: Type,
  policy: TPolicy
): policy is Extract<TPolicy, { policy_type: Type }> {
  return policy.policy_type === type;
}

function hasRestrictions(policy: TPolicy): boolean {
  if (policy.policy_type === "ChainSigTransaction") {
    return policy.policy_details.ChainSigTransaction.restrictions.length > 0;
  }

  if (policy.policy_type === "NearNativeTransaction") {
    return policy.policy_details.NearNativeTransaction.restrictions.length > 0;
  }

  return false;
}

function withRestrictions(policy: TPolicy): {
  policy: TRestrictionPolicy;
  restrictions: TRestrictions;
} | null {
  if (policy.policy_type === "ChainSigTransaction") {
    return {
      policy,
      restrictions: policy.policy_details.ChainSigTransaction.restrictions,
    };
  }

  if (policy.policy_type === "NearNativeTransaction") {
    return {
      policy,
      restrictions: policy.policy_details.NearNativeTransaction.restrictions,
    };
  }

  return null;
}

function decodeInterface(base64: string): string {
  try {
    if (!base64) return "-";
    const decoded = atob(base64);

    try {
      const parsed = JSON.parse(decoded);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return decoded;
    }
  } catch {
    return "-";
  }
}

const vaults: {
  chains: ChainName[]
  vault_id: string;
  kernel_id: string;
  share_price_decimals: number;
  share_deciamls: number;
  base_asset_decimals: number;
  curated_by: string;
  name: string;
  description?: string;
  nonNearMinReadableDeposit?: number;
}[] = [
  {
    vault_id: "near.meteor-vaults.near",
    kernel_id: "kernel-near.meteor-vaults.near",
    share_price_decimals: 8,
    share_deciamls: 24,
    base_asset_decimals: 24,
    curated_by: "Dew Finance",
    name: "NEAR Vault",
    chains: ["near"]
  },
  {
    vault_id: "usdt.meteor-vaults.near",
    kernel_id: "kernel-usdt.meteor-vaults.near",
    share_price_decimals: 8,
    share_deciamls: 18,
    base_asset_decimals: 6,
    curated_by: "Dew Finance",
    name: "USDT Vault",
    chains: ["near", "solana", "eth", "arbitrum", "monad", "plasma", "polygon", "bsc", "bera"],
    nonNearMinReadableDeposit: 2
  },
  {
    vault_id: "usdc.meteor-vaults.near",
    kernel_id: "kernel-usdc.meteor-vaults.near",
    share_price_decimals: 8,
    share_deciamls: 18,
    base_asset_decimals: 6,
    curated_by: "Dew Finance",
    name: "USDC Vault",
    chains: ["near", "solana", "eth", "arbitrum", "monad", "polygon", "bsc", "base"],
    nonNearMinReadableDeposit: 2
  },
  {
    vault_id: "zec.meteor-vaults.near",
    kernel_id: "kernel-zec.meteor-vaults.near",
    share_price_decimals: 8,
    share_deciamls: 18,
    base_asset_decimals: 8,
    curated_by: "Dew Finance",
    name: "ZEC Vault",
    chains: ["near", "zec"],
    nonNearMinReadableDeposit: 0.005
  },
]

const DEPRECATED_TOKENS = ["dew-rneardefi-vault.near"];

export const vaultUtils = {
  isPolicyOfType,
  hasRestrictions,
  withRestrictions,
  decodeInterface,
  vaults,
  DEPRECATED_TOKENS
};
