import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    "https://meteor-leding-dev-276870342533.europe-southwest1.run.app",
  headers: {
    "Content-Type": "application/json",
  },
});

const createDewAccount = (data: {
  blockchain_id: string;
  blockchain_address: string;
  signature: string;
  deadline: string;
}) => {
  return axiosInstance.post("/dew-account/create-account", data);
};

const signTransaction = (data: {
  receiverId: string;
  args: {
    blockchain_id: string;
    blockchain_address: string;
    signature: string;
    // TODO: fix this type later
    transaction: any;
  };
}) => {
  return axiosInstance.post("/dew-account/sponsor-sign", data);
};

const storageDeposit = (data: { account_id: string; vault_id: string }) => {
  return axiosInstance.post("/dew-account/sponsor-storage-deposit", data);
};

const getVaultApy = (data: {
  variant: "1" | "7" | "30";
  vaultContractId: string;
}) => {
  return axiosInstance.get<string>("/dew-vault/vault-apy", {
    params: data
  });
};

export const DewAccountBackend = {
  createDewAccount,
  signTransaction,
  storageDeposit,
  getVaultApy,
};
