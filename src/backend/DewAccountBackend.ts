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

export const DewAccountBackend = {
  createDewAccount,
};
