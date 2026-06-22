import { meteorUtils } from "../utils/meteorUtils";

const submit1ClickDepositHash = async ({
  depositAddress,
  depositHash,
}: {
  depositAddress: string;
  depositHash: string;
}) => {
  const res = await fetch(
    "https://meteor-backend-v2-dev-276870342533.europe-southwest1.run.app/api/dew_vault/submit_1click_hash",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        depositAddress,
        depositHash,
      }),
    },
  );

  const json = await res.json();

  const structureValidate =
    meteorUtils.zMeteorApiResponseAnyError.safeParse(json);

  if (!structureValidate.success) {
    throw new Error("Invalid response structure");
  }

  if (!structureValidate.data.ok) {
    throw new Error(structureValidate.data.error);
  }
};

export const intentsMutations = {
  submit1ClickDepositHash,
};
