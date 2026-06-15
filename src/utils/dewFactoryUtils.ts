import type { ChainName } from "../stores/wallet_store";
import { nearUtils } from "./nearUtils";

const FACTORY_CONTRACT_ID = "aa-dew.near";

const getBlockchainIdFromChainName = (chain: ChainName) => {
  switch (chain) {
    case "arbitrum":
    case "eth":
      return "ethereum";
    case "solana":
      return "solana";
    case "near":
      throw new Error("Near should use native wallet selector");
  }
};

const getAccountDetailsFromAddressAndChain = async ({
  address,
  chain,
}: {
  address: string;
  chain: ChainName;
}) => {
  const blockchainId = getBlockchainIdFromChainName(chain);
  const shortBlockchainId = blockchainId.slice(0, 3);

  const nearAddress = (await nearUtils.provider.callFunction(
    FACTORY_CONTRACT_ID,
    "preview_account_id",
    {
      blockchain_id: blockchainId,
      blockchain_address: address,
    }
  )) as string;

  return {
    nearAddress,
    shortBlockchainId,
    blockchainId,
  };
};

const getMessageForCreateAccount = async ({
  blockchainAddress,
  chain,
}: {
  blockchainAddress: string;
  chain: ChainName;
}) => {
  const { blockchainId, nearAddress } =
    await getAccountDetailsFromAddressAndChain({
      address: blockchainAddress,
      chain,
    });

  const message = (await nearUtils.provider.callFunction(
    FACTORY_CONTRACT_ID,
    "message_for_create_account",
    {
      blockchain_id: blockchainId,
      blockchain_address: blockchainAddress,
    }
  )) as string;

  const parsedMessage = JSON.parse(message);

  return {
    message: message,
    blockchainId,
    nearAddress,
    deadline: parsedMessage.deadline,
  };
};

const checkAccountExists = async ({
  address,
  chain
}: {
  address: string;
  chain: ChainName
}): Promise<{ accountExists: true; nearAddress: string } | { accountExists: false; nearAddress: null }> => {
  const { nearAddress } =
    await getAccountDetailsFromAddressAndChain({
      address,
      chain,
    });

  const accountExists = await nearUtils.provider
    .viewAccount(nearAddress)
    .then(() => true)
    .catch(() => false);

  if(accountExists) {
    return {
      accountExists: true,
      nearAddress
    }
  }

  return {
    accountExists: false,
    nearAddress: null
  }
}

const isAbstractAccount = (address: string) => {
  return address.endsWith(`.${FACTORY_CONTRACT_ID}`);
}

export const dewFactoryUtils = {
  getAccountDetailsFromAddressAndChain,
  getMessageForCreateAccount,
  getBlockchainIdFromChainName,
  checkAccountExists,
  isAbstractAccount
};
