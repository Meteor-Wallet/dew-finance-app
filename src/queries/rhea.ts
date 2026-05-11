import { queryOptions } from "@tanstack/react-query";
import z from "zod";
const priceSchema = z.record(
  z.string(),
  z.object({
    price: z.string(),
    symbol: z.string(),
    decimal: z.number(),
  }),
);
const getTokenPrices = () => {
  return queryOptions({
    queryKey: ["rhea", "tokenPrices"],
    queryFn: async () => {
      const response = await fetch("https://api.rhea.finance/list-token-price");

      const json = await response.json();
      return priceSchema.parse(json);
    },
  });
};

export const rheaQueries = {
  getTokenPrices,
};
