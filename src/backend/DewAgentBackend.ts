import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    "https://7eaecaf90f72d6db5cfdff0e96a026ea5c8d240d-3000.dstack-prod4.phala.network",
  headers: {
    "Content-Type": "application/json",
  },
});

const getCacheBalanceDistribution = () => {
  return axiosInstance.get<
    {
      name: string;
      chain: string;
      defi: string;
      description: string;
      amount: number;
      usdValue: number;
      assetSymbol: string;
      link?: string;
    }[]
  >("cache_balance_distribution");
};

export const DewAgentBackend = {
  getCacheBalanceDistribution,
};
