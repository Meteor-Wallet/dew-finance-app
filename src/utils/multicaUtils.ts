import type { ChainName } from "../stores/wallet_store";
import { nearUtils } from "./nearUtils";

const CONTRACT_ID = "multica.near";

const chainNameToMulticaBlockchainId = (chain: ChainName) => {
  switch (chain) {
    case "arbitrum":
    case "eth":
      return "EVM";
    case "solana":
      return "Solana";
    case "near":
      throw new Error("Near should use native wallet selector");
  }
};

const addressToMulticaFormat = (address: string) => {
  if (address.startsWith("0x")) {
    return address.toLowerCase().slice(2);
  }
  return address;
} 

const checkAccountExists = async ({
  address,
  chain,
}: {
  address: string;
  chain: ChainName;
}): Promise<
  | { accountExists: true; nearAddress: string }
  | { accountExists: false; nearAddress: null }
> => {

  const addressToBeChecked = addressToMulticaFormat(address);

  const mca = await nearUtils.provider.callFunction<string>(
    CONTRACT_ID,
    "get_mca_by_wallet",
    {
      wallet: {
        [chainNameToMulticaBlockchainId(chain)]: addressToBeChecked,
      },
    },
  );

  if (mca) {
    return { accountExists: true, nearAddress: mca };
  } else {
    return { accountExists: false, nearAddress: null };
  }
};

export const multicaUtils = {
  checkAccountExists,
  addressToMulticaFormat
};
