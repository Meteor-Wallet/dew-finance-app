import type { ChainName } from "../stores/wallet_store";
import { nearUtils } from "./nearUtils";
import type { ConnectorAction } from "@hot-labs/near-connect";

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

const getMulticaAccountNonce = async (mcaId: string) => {
  const nonce = await nearUtils.provider.callFunction<string>(
    mcaId,
    "get_nonce",
    {},
  );

  if(!nonce){
    throw new Error("Failed to fetch nonce for MCA " + mcaId);
  }

  return nonce
};

const nearTxToBusiness = async (params: {
  tx: {
    receiverId: string;
    actions: ConnectorAction[];
  }[];
  mcaId: string;
}) => {
  const nonce = await getMulticaAccountNonce(params.mcaId);

  return {
    nonce,
    deadline: new Date().getTime(),
    tx_requests: params.tx.map(t => {
      if(!t.actions.every(a => a.type === 'FunctionCall')){
        throw new Error("Unsupported action type in transaction request");
      }
      
      return {
        FunctionCall: {
          receiver_id: t.receiverId,
          function_calls: t.actions.map(v => {
            return {
              gas: v.params.gas,
              args: v.params.args,
              deposit: v.params.deposit,
              method_name: v.params.methodName,
            }
          })
        }
      }
    })
  }
};

const getMessageToBeSignedForTx = async (params: {
  tx: {
    receiverId: string;
    actions: ConnectorAction[];
  }[];
  mcaId: string;
  chain: ChainName;
}) => {
  const business = await nearTxToBusiness({
    tx: params.tx,
    mcaId: params.mcaId,
  });
  return JSON.stringify(business);
};

export const multicaUtils = {
  checkAccountExists,
  addressToMulticaFormat,
  getMessageToBeSignedForTx
};
