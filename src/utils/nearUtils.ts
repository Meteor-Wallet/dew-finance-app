import { JsonRpcProvider } from "@near-js/providers";

const PREDEFINED_RPC_OPTIONS = [
  { name: "deltarpc", url: "https://nearinner.deltarpc.com" },
  { name: "fastnear", url: "https://free.rpc.fastnear.com" },
] as const;

const STORAGE_KEY = "near_rpc_url";
const CUSTOM_RPCS_KEY = "near_custom_rpcs";

function loadCustomRpcs(): { name: string; url: string }[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_RPCS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addCustomRpc(name: string, url: string) {
  const customs = loadCustomRpcs();
  customs.push({ name, url });
  localStorage.setItem(CUSTOM_RPCS_KEY, JSON.stringify(customs));
}

function removeCustomRpc(url: string) {
  const customs = loadCustomRpcs().filter((r) => r.url !== url);
  localStorage.setItem(CUSTOM_RPCS_KEY, JSON.stringify(customs));
}

const savedUrl = localStorage.getItem(STORAGE_KEY);
const allOptions = [...PREDEFINED_RPC_OPTIONS, ...loadCustomRpcs()];
const initialUrl = allOptions.some((r) => r.url === savedUrl)
  ? savedUrl!
  : PREDEFINED_RPC_OPTIONS[0].url;

let rpcProvider = new JsonRpcProvider({ url: initialUrl });
let rpc_url = initialUrl;

const setRpcUrl = (url: string) => {
  rpcProvider = new JsonRpcProvider({ url });
  rpc_url = url;
  localStorage.setItem(STORAGE_KEY, url);
};

const archivalProvider = new JsonRpcProvider({
  url: "https://archival-rpc.mainnet.fastnear.com",
});

export const nearUtils = {
  get provider() { return rpcProvider; },
  get RPC_URL() { return rpc_url; },
  archivalProvider,
  PREDEFINED_RPC_OPTIONS,
  loadCustomRpcs,
  addCustomRpc,
  removeCustomRpc,
  setRpcUrl,
};
