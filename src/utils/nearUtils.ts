import { JsonRpcProvider } from "@near-js/providers";

const provider = new JsonRpcProvider({
  url: "https://free.rpc.fastnear.com",
});

export const nearUtils = {
  provider,
};
