import {
  zChainSigTransactionPolicy,
  type TChainSigTransactionPolicy,
  type TPolicy,
} from "../queries/vault";

export function isChainSigTransaction(
  policy: TPolicy
): policy is TChainSigTransactionPolicy {
  return zChainSigTransactionPolicy.safeParse(policy).success;
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

export const vaultUtils = {
  isChainSigTransaction,
  decodeInterface,
};
