import type { ConnectorAction } from "@hot-labs/near-connect";
import type { ChainName } from "../stores/wallet_store";
import { dewFactoryUtils } from "./dewFactoryUtils";
import { nearUtils } from "./nearUtils";
import { meteorUtils } from "./meteorUtils";
import type { FinalExecutionOutcome } from "@hot-labs/near-connect/build/types";

type TFunctionCall_Action = {
  type: "FunctionCall";
  params: {
    methodName: string;
    args: unknown;
    gas: string;
    deposit: string;
  };
};

type Action = TFunctionCall_Action;

type TDewTransaction = {
  receiverId: string;
  actions: Action[];
};

const sponsorStorageDeposit = async ({
  vaultContractId,
  nearAccountId,
}: {
  vaultContractId: string;
  nearAccountId: string;
}) => {
  const response = await fetch(new URL("/api/dew_vault/storage_deposit", backendURL), {
    method: "POST",
    body: JSON.stringify({
      tokenId: vaultContractId,
      accountId: nearAccountId,
    }),
  });

  const result = await response.json();

  const structureValidate =
    meteorUtils.zMeteorApiResponseAnyError.safeParse(result);

  if (!structureValidate.success) {
    throw new Error("Invalid response structure");
  }

  if (structureValidate.data.ok) {
    return structureValidate.data.value as FinalExecutionOutcome;
  } else {
    throw new Error(
      `API error: ${JSON.stringify(structureValidate.data.error)}`,
    );
  }
};

const convertConnectorTransactionToDewTransaction = ({
  transaction,
}: {
  transaction: {
    receiverId: string;
    actions: ConnectorAction[];
  };
}): TDewTransaction => {
  return {
    receiverId: transaction.receiverId,
    actions: transaction.actions.map((action) => {
      if (action.type === "FunctionCall") {
        return {
          type: "FunctionCall",
          params: {
            methodName: action.params.methodName,
            args: action.params.args,
            gas: action.params.gas,
            deposit: action.params.deposit,
          },
        } as TFunctionCall_Action;
      } else {
        throw new Error("Unsupported action type");
      }
    }),
  };
};

const backendURL =
  "https://meteor-backend-v2-dev-276870342533.europe-southwest1.run.app";

const broadcastTransaction = async (params: {
  transaction: TDewTransaction;
  signature: string;
  blockchain_id: string;
  blockchain_address: string;
  account_id: string;
  bridge_origin_address?: string;
}) => {
  const response = await fetch(new URL("/api/dew_vault/sign_tx", backendURL), {
    method: "POST",
    body: JSON.stringify(params),
  });

  const result = await response.json();

  const structureValidate =
    meteorUtils.zMeteorApiResponseAnyError.safeParse(result);

  if (!structureValidate.success) {
    throw new Error("Invalid response structure");
  }

  if (structureValidate.data.ok) {
    return structureValidate.data.value as FinalExecutionOutcome;
  } else {
    if(structureValidate.data.error?.name === "MeteorError") {
      const message = structureValidate.data.error?.message
      if(message){
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsedMessage: any
        try{
          parsedMessage = JSON.parse(message)
        }catch(err){
          console.log("Failed to parse error message", err)
        }

        if(parsedMessage && parsedMessage?.kind?.kind?.FunctionCallError?.ExecutionError) {
          throw new Error(parsedMessage?.kind?.kind?.FunctionCallError?.ExecutionError)
        }
      }
    }
    throw new Error(
      `API error: ${JSON.stringify(structureValidate.data.error)}`,
    );
  }
};

// for non NEAR wallet, use xxx.aa-dew.near abstract account to interact with
// vault contract that sits on NEAR
// to sign tx on the xxx.aa-dew.near abstract account, we need to
// 1. convert the connector transaction to dew transaction format (convertConnectorTransactionToDewTransaction)
// 2. get the message to sign for the transaction (getMessageForSigningTransaction)
// 3. then, prompt sign message from selector for non near wallet to sign the message
// 4. after getting the signature, we attach the signature, blockchain id, blockchain address and dew transaction to broadcast the tx ()
// we dont support signing multiple transactions in one go, this is because
// browser is likely to block subsequent sign message prompt without user interaction
const signAndSendTransaction = async ({
  transaction,
  nearAccountId,
  blockchainAddress,
  chain,
  signMessage,
  bridgeOriginAddress
}: {
  transaction: {
    receiverId: string;
    actions: ConnectorAction[];
  };
  nearAccountId: string;
  blockchainAddress: string;
  chain: ChainName;
  signMessage: (message: string) => Promise<string>;
  bridgeOriginAddress?: string;
}) => {
  const dewTx = convertConnectorTransactionToDewTransaction({
    transaction,
  });

  const messageForSigning = await getMessageForSigningTransaction({
    blockchainAddress: blockchainAddress,
    chain,
    transaction: dewTx,
    nearAddress: nearAccountId,
  });

  const signature = await signMessage(messageForSigning.message);

  await broadcastTransaction({
    transaction: dewTx,
    signature,
    account_id: nearAccountId,
    blockchain_id: messageForSigning.blockchainId,
    blockchain_address: blockchainAddress,
    bridge_origin_address: bridgeOriginAddress
  });
};

const getMessageForSigningTransaction = async ({
  blockchainAddress,
  chain,
  transaction,
  nearAddress,
}: {
  blockchainAddress: string;
  chain: ChainName;
  transaction: TDewTransaction;
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
    },
  )) as string;

  return { message, blockchainId };
};

export const dewAccountUtils = {
  getMessageForSigningTransaction,
  sponsorStorageDeposit,
  signAndSendTransaction,
};
