import type { ChainName } from "../stores/wallet_store";

const FACTORY_CONTRACT_ID = "aa-dew.near";

const getAccountDetailsFromAddressAndChain = ({
  address,
  chain,
}: {
  address: string;
  chain: ChainName;
}) => {
  const blockchainId = (() => {
    switch (chain) {
      case "arbitrum":
      case "eth":
        return "ethereum";
      case "solana":
        return "solana";
    }
  })();
  const shortBlockchainId = blockchainId.slice(0, 3);
  const nearAddress = `${address.toLowerCase()}-${shortBlockchainId}.${FACTORY_CONTRACT_ID}`;

  return {
    nearAddress,
    shortBlockchainId,
    blockchainId,
  };
};

const getMessageForCreateAccount = ({
  blockchainAddress,
  chain,
}: {
  blockchainAddress: string;
  chain: ChainName;
}) => {
  const { blockchainId, nearAddress } = getAccountDetailsFromAddressAndChain({
    address: blockchainAddress,
    chain,
  });

  const deadline = ((Date.now() + 1 * 60 * 1000) * 1000000).toString();

  return {
    message: JSON.stringify({
      account_id: nearAddress,
      blockchain_address: blockchainAddress,
      blockchain_id: blockchainId,
      deadline,
    }),
    blockchainId,
    nearAddress,
    deadline,
  };
};

export const dewFactoryUtils = {
  getAccountDetailsFromAddressAndChain,
  getMessageForCreateAccount,
};
