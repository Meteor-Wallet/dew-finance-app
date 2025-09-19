import { queryOptions } from "@tanstack/react-query";
import type { ChainName } from "../stores/wallet_store";
import axios from "axios";
import { nearUtils } from "../utils/nearUtils";

const chainDefuserAxios = axios.create({
  baseURL: "https://bridge.chaindefuser.com/rpc",
});

type TChainDefuserResultSuccess<T> = {
  id: number | string;
  jsonrpc: string;
  result: T;
};

type TChainDefuserResultError = {
  id: number | string;
  jsonrpc: string;
  error: string;
};

type TChainDefuserResult<T> =
  | TChainDefuserResultSuccess<T>
  | TChainDefuserResultError;

const chainDefuserResultParser = <T>(result: TChainDefuserResult<T>) => {
  if ("error" in result) {
    throw new Error(result.error);
  }

  return result.result;
};

const getIntentsAddressQueryOptions = ({
  chain,
  nearAddress,
}: {
  chain: ChainName;
  nearAddress: string;
}) => {
  return queryOptions({
    queryKey: [
      "intents",
      "intentsAddress",
      {
        chain,
        nearAddress,
      },
    ],
    queryFn: async () => {
      let intentsChain = (() => {
        switch (chain) {
          case "arbitrum":
            return "eth:42161";
          case "eth":
            return "eth:1";
          case "solana":
            return "sol:mainnet";
        }
      })();
      const { data } = await chainDefuserAxios.post<
        TChainDefuserResult<{
          address: string;
          chain: string;
        }>
      >("", {
        jsonrpc: "2.0",
        id: "dontcare",
        method: "deposit_address",
        params: [
          {
            account_id: nearAddress,
            chain: intentsChain,
          },
        ],
      });

      return chainDefuserResultParser(data);
    },
  });
};

const getBalanceInIntentsQueryOptions = ({
  nearAddress,
  intentsTokenId,
}: {
  intentsTokenId: string;
  nearAddress: string;
}) => {
  return queryOptions({
    queryKey: [
      "intents",
      "intentsBalance",
      {
        intentsTokenId,
        nearAddress,
      },
    ],
    queryFn: async () => {
      const balance = (await nearUtils.provider.callFunction(
        "intents.near",
        "mt_balance_of",
        {
          account_id: nearAddress,
          token_id: intentsTokenId,
        }
      )) as string;
      return balance;
    },
  });
};

const getSupportedTokensQueryOptions = () => {
  return queryOptions({
    queryKey: ["intents", "supportedTokens"],
    queryFn: async () => {
      const { data } = await chainDefuserAxios.post<
        TChainDefuserResult<{
          tokens: ({
            defuse_asset_identifier: string;
            near_token_id: string;
            decimals: number;
            asset_name: string;
            min_deposit_amount: string;
            min_withdrawal_amount: string;
            withdrawal_fee: string;
            intents_token_id: string;
          } & (
            | { standard: "nep141" }
            | {
                standard: "nep245";
                multi_token_id: string;
              }
          ))[];
        }>
      >("", {
        jsonrpc: "2.0",
        id: "dontcare",
        method: "supported_tokens",
        params: [],
      });

      return chainDefuserResultParser(data);
    },
  });
};

export const intentsQueries = {
  getIntentsAddressQueryOptions,
  getBalanceInIntentsQueryOptions,
  getSupportedTokensQueryOptions
};
