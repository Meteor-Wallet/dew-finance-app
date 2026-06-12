import z from "zod";

const zMeteorApiResponse_Error = z.object({
  ok: z.literal(false),
  error: z.any(),
});

const zMeteorApiResponse_Ok = z.object({
  ok: z.literal(true),
  value: z.any(),
});

const zMeteorApiResponseAnyError = z.union([
  zMeteorApiResponse_Error,
  zMeteorApiResponse_Ok,
]);

export const meteorUtils = {
  zMeteorApiResponseAnyError,
};
