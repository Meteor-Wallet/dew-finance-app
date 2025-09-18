import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    "https://meteor-leding-dev-276870342533.europe-southwest1.run.app/dew-account",
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
  return axiosInstance.post("create-account", data);
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
  return axiosInstance.post("sponsor-sign", data);
};

const storageDeposit = (data: { account_id: string; vault_id: string }) => {
  return axiosInstance.post("sponsor-storage-deposit", data);
};

export const DewAccountBackend = {
  createDewAccount,
  signTransaction,
  storageDeposit,
};
