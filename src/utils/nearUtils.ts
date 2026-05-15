import { JsonRpcProvider } from "@near-js/providers";

const provider = new JsonRpcProvider({
  // url: "https://free.rpc.fastnear.com",
  url: "https://nearinner.deltarpc.com",
});

const archivalProvider = new JsonRpcProvider({
  url: "https://archival-rpc.mainnet.fastnear.com",
});

export const nearUtils = {
  provider,
  archivalProvider
};
