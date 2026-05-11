import { JsonRpcProvider } from "@near-js/providers";

const provider = new JsonRpcProvider({
  url: "https://free.rpc.fastnear.com",
});

const archivalProvider = new JsonRpcProvider({
  url: "https://archival-rpc.mainnet.fastnear.com",
});

export const nearUtils = {
  provider,
  archivalProvider
};
