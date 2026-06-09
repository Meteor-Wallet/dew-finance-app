import { queryOptions } from "@tanstack/react-query";
import { nearUtils } from "../utils/nearUtils";
import type { ChainName } from "../stores/wallet_store";
import type { ConnectorAction } from "@hot-labs/near-connect";

type TEvmWallet = {
  EVM: string;
};

type TSolanaWallet = {
  Solana: string;
};

type TWallet = TEvmWallet | TSolanaWallet;

const getListWalletsByMcaQueryOptions = ({ mca }: { mca: string }) => {
  return queryOptions({
    queryKey: [
      "multica",
      "listWalletsByMca",
      {
        mca,
      },
    ],
    queryFn: async () => {
      const result = await nearUtils.provider.callFunction<TWallet[]>(
        "multica.near",
        "list_wallets_by_mca",
        {
          mca_id: mca,
        },
      );

      return result;
    },
  });
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

const getMessageToBeSignedForTx = (params: {
  tx: {
    receiverId: string;
    actions: ConnectorAction[];
  }[];
  chain: ChainName;
}) => {
  return "stub for now";
};

export const multicaQueries = {
  getListWalletsByMcaQueryOptions,
  getMessageToBeSignedForTx,
  nearTxToBusiness
};
