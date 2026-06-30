import { queryOptions } from "@tanstack/react-query";
import z from "zod";
import { meteorUtils } from "../utils/meteorUtils";

const zGet1ClickQuotation_Input = z.object({
  dry: z.boolean(),
  swapType: z.enum(["EXACT_INPUT", "EXACT_OUTPUT"]),
  slippageTolerance: z.number(),
  originAsset: z.string(),
  depositType: z.enum(["ORIGIN_CHAIN", "INTENTS"]),
  destinationAsset: z.string(),
  amount: z.string(),
  refundTo: z.string(),
  refundType: z.enum(["ORIGIN_CHAIN", "INTENTS"]),
  recipient: z.string(),
  recipientType: z.enum(["DESTINATION_CHAIN", "INTENTS"]),
});

const zQuotation = z.object({
  depositAddress: z.optional(z.string()),
  amountIn: z.string(),
  amountInFormatted: z.string(),
  amountInUsd: z.string(),
  minAmountIn: z.string(),
  amountOut: z.string(),
  amountOutFormatted: z.string(),
  amountOutUsd: z.string(),
  minAmountOut: z.string(),
  deadline: z.optional(z.string()),
  timeWhenInactive: z.optional(z.string()),
  timeEstimate: z.optional(z.number()),
});

const zQuotation_Response = z.object({
  timestamp: z.string(),
  signature: z.string(),
  quoteRequest: zGet1ClickQuotation_Input,
  quote: zQuotation,
});

const zTokens_Response = z.array(
  z.object({
    assetId: z.string(),
    decimals: z.number(),
    blockchain: z.string(),
    symbol: z.string(),
    price: z.number(),
    contractAddress: z.string().optional(),
  }),
);

const zQuotation_Request = z.object({
  dry: z.boolean(),
  swapType: z.enum(["EXACT_INPUT", "EXACT_OUTPUT"]),
  slippageTolerance: z.number(),
  originAsset: z.string(),
  depositType: z.enum(["ORIGIN_CHAIN", "INTENTS"]),
  destinationAsset: z.string(),
  amount: z.string(),
  refundTo: z.string(),
  refundType: z.enum(["ORIGIN_CHAIN", "INTENTS"]),
  recipient: z.string(),
  recipientType: z.enum(["DESTINATION_CHAIN", "INTENTS"]),
  deadline: z.string(),
  referral: z.optional(z.string()),
  quoteWaitingTimeMs: z.optional(z.number()),
  appFees: z
    .array(
      z.object({
        recipient: z.string(),
        fee: z.number(),
      }),
    )
    .optional(),
});

const zSwapDetails = z.object({
  intentHashes: z.array(z.string()),
  nearTxHashes: z.array(z.string()),
  amountIn: z.nullable(z.string()),
  amountInFormatted: z.nullable(z.string()),
  amountInUsd: z.nullable(z.string()),
  amountOut: z.nullable(z.string()),
  amountOutFormatted: z.nullable(z.string()),
  amountOutUsd: z.nullable(z.string()),
  slippage: z.nullable(z.number()),
  originChainTxHashes: z.array(
    z.object({
      hash: z.string(),
      explorerUrl: z.string(),
    }),
  ),
  destinationChainTxHashes: z.array(
    z.object({
      hash: z.string(),
      explorerUrl: z.string(),
    }),
  ),
  refundedAmount: z.optional(z.string()),
  refundedAmountFormatted: z.optional(z.string()),
  refundedAmountUsd: z.optional(z.string()),
});

const zSwapExecution_Response = z.object({
  status: z.enum([
    "PENDING_DEPOSIT",
    "INCOMPLETE_DEPOSIT",
    "KNOWN_DEPOSIT_TX",
    "PROCESSING",
    "SUCCESS",
    "REFUNDED",
    "FAILED",
  ]),
  updatedAt: z.string(),
  swapDetails: zSwapDetails,
  quoteResponse: z.object({
    timestamp: z.string(),
    signature: z.string(),
    quoteRequest: zQuotation_Request,
    quote: zQuotation,
  }),
});

const get1ClickTokens = () => {
  return queryOptions({
    queryKey: ["intents", "1click-tokens"],
    queryFn: async () => {
      const res = await fetch("https://1click.chaindefuser.com/v0/tokens");

      const json = await res.json();

      const parsedJson = zTokens_Response.parse(json)

      const filtered = parsedJson.filter((e) => !e.symbol.includes("DEPRECATED"))

      return filtered;
    },
    staleTime: Infinity,
  });
};

const get1ClickQuotation = (
  params: z.infer<typeof zGet1ClickQuotation_Input>,
) => {
  return queryOptions({
    queryKey: ["intents", "1click-quotation", params],
    queryFn: async () => {
      const res = await fetch(
        "https://backend-v2.meteorwallet.app/api/dew_vault/get_1click_quotation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        },
      );

      const json = await res.json();

      const structureValidate = meteorUtils.zMeteorApiResponseAnyError.safeParse(json);

      if (!structureValidate.success) {
        throw new Error("Invalid response structure");
      }

      if (structureValidate.data.ok) {
        return zQuotation_Response.parse(structureValidate.data.value);
      }

      throw new Error(structureValidate.data.error);
    },
  });
};

const get1ClickStatus = ({depositAddress}: {
  depositAddress: string;
}) => {
  return queryOptions({
    queryKey: ["intents", "1click-status", depositAddress],
    queryFn: async () => {
      const res = await fetch(
        "https://backend-v2.meteorwallet.app/api/dew_vault/1click_status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ depositAddress }),
        },
      );

      const json = await res.json();

      const structureValidate = meteorUtils.zMeteorApiResponseAnyError.safeParse(json);

      if (!structureValidate.success) {
        throw new Error("Invalid response structure");
      }

      if (structureValidate.data.ok) {
        return zSwapExecution_Response.parse(structureValidate.data.value);
      }

      throw new Error(structureValidate.data.error);
    }
  })
}

export const intentsQueries = {
  get1ClickQuotation,
  get1ClickTokens,
  get1ClickStatus
};
