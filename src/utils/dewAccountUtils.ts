import type { ChainName } from "../stores/wallet_store";
import { dewFactoryUtils } from "./dewFactoryUtils";
import { nearUtils } from "./nearUtils";

const getMessageForSigningTransaction = async ({
  blockchainAddress,
  chain,
  transaction,
  nearAddress,
}: {
  blockchainAddress: string;
  chain: ChainName;
  // TODO: fix this type later
  transaction: any;
  nearAddress: string;
}) => {
  const blockchainId = dewFactoryUtils.getBlockchainIdFromChainName(chain);

  const message = (await nearUtils.provider.callFunction(
    nearAddress,
    "message_for_sign_transaction",
    {
      blockchain_id: blockchainId,
      blockchain_address: blockchainAddress,
      transaction,
    }
  )) as string;

  return { message, blockchainId };
};

export const dewAccountUtils = {
  getMessageForSigningTransaction,
};
