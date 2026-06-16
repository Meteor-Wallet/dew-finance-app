import type { ChainName } from "../stores/wallet_store";
import { dewAccountUtils } from "./dewAccountUtils";
import { nearUtils } from "./nearUtils";

const FACTORY_CONTRACT_ID = "aa-dew.near";

const CHAIN_BLOCKCHAIN_MAP = [
  { blockchainId: "ethereum", chain: ["eth", "arbitrum"] as ChainName[] },
  { blockchainId: "solana", chain: ["solana"] as ChainName[] },
];

const CHAIN_TO_BLOCKCHAIN_ID = Object.fromEntries(
  CHAIN_BLOCKCHAIN_MAP.flatMap(({ blockchainId, chain }) => chain.map((c) => [c, blockchainId])),
) as Partial<Record<ChainName, string>>;

const BLOCKCHAIN_ID_TO_CHAIN = Object.fromEntries(
  CHAIN_BLOCKCHAIN_MAP.map(({ blockchainId, chain }) => [blockchainId, chain[0]]),
) as Record<string, ChainName>;

const getBlockchainIdFromChainName = (chain: ChainName): string => {
  const blockchainId = CHAIN_TO_BLOCKCHAIN_ID[chain];
  if (!blockchainId) throw new Error("Near should use native wallet selector");
  return blockchainId;
};

const getChainNameFromBlockchainId = (blockchainId: string): ChainName => {
  const chain = BLOCKCHAIN_ID_TO_CHAIN[blockchainId];
  if (!chain) throw new Error(`Unknown blockchain ID: ${blockchainId}`);
  return chain;
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
    },
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
  const blockchainId = getBlockchainIdFromChainName(chain);

  const message = (await nearUtils.provider.callFunction(
    FACTORY_CONTRACT_ID,
    "message_for_create_account",
    {
      blockchain_id: blockchainId,
      blockchain_address: blockchainAddress,
    },
  )) as string;

  const parsedMessage = JSON.parse(message) as {
    account_id: string;
    blockchain_id: string;
    blockchain_address: string;
    deadline: string;
  };

  return {
    parsedMessage,
    message,
  };
};

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
  const { nearAddress } = await getAccountDetailsFromAddressAndChain({
    address,
    chain,
  });

  const accountExists = await nearUtils.provider
    .viewAccount(nearAddress)
    .then(() => true)
    .catch(() => false);

  if (accountExists) {
    return {
      accountExists: true,
      nearAddress,
    };
  }

  return {
    accountExists: false,
    nearAddress: null,
  };
};

const getAbstractAccountsByWallet = async ({
  blockchainAddress,
  chain,
}: {
  blockchainAddress: string;
  chain: ChainName;
}) => {
  const blockchainId = getBlockchainIdFromChainName(chain);

  const accountIds = await nearUtils.provider.callFunction<string[]>(
    FACTORY_CONTRACT_ID,
    "list_account_ids_for_wallet",
    {
      blockchain_id: blockchainId,
      blockchain_address: blockchainAddress,
    },
  );

  return accountIds || [];
};

const getWalletsByAbstractAccount = async ({
  nearAccountId,
}: {
  nearAccountId: string;
}) => {
  // first is blockchain id, second is blockchain address
  const wallets = await nearUtils.provider.callFunction<[string, string][]>(
    FACTORY_CONTRACT_ID,
    "list_wallets_for_account_id",
    {
      account_id: nearAccountId,
    },
  );

  return wallets || [];
};

const createAbstractAccount = async ({
  blockchainAddress,
  chain,
  signMessage
}: {
  blockchainAddress: string;
  chain: ChainName;
  signMessage: (message: string) => Promise<string>;
}) => {
  // throw if the wallet is already connected
  const existingWallets = await getWalletsByAbstractAccount({
    nearAccountId: `${blockchainAddress}.${FACTORY_CONTRACT_ID}`,
  });

  if (existingWallets.length > 0) {
    throw new Error("Wallet is connected with another abstract account");
  }

  const { message, parsedMessage } = await getMessageForCreateAccount({
    blockchainAddress,
    chain,
  });

  const signature = await signMessage(message)

  await dewAccountUtils.sponsorCreateAccount({
    blockchainAddress: parsedMessage.blockchain_address,
    blockchainId: parsedMessage.blockchain_id,
    deadline: parsedMessage.deadline,
    signature,
  });
}

const isAbstractAccount = (address: string) => {
  return address.endsWith(`.${FACTORY_CONTRACT_ID}`);
};

export const dewFactoryUtils = {
  getAccountDetailsFromAddressAndChain,
  getMessageForCreateAccount,
  getBlockchainIdFromChainName,
  getChainNameFromBlockchainId,
  checkAccountExists,
  isAbstractAccount,
  createAbstractAccount,
  getAbstractAccountsByWallet,
  getWalletsByAbstractAccount,
};
