import {
  type TPolicy,
  type TPolicyType,
  type TRestrictionPolicy,
  type TRestrictions,
} from "../queries/vault";

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

const DEFAULT_VAULT_CONTRACT_ID = "stable-test-2.dew-finance.near";

export const vaultUtils = {
  isPolicyOfType,
  hasRestrictions,
  withRestrictions,
  decodeInterface,
  DEFAULT_VAULT_CONTRACT_ID,
};
