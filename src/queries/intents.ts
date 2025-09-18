import { queryOptions } from "@tanstack/react-query";
import type { ChainName } from "../stores/wallet_store";
import axios from "axios";

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

export const intentsQueries = {};
