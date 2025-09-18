import { useMutation } from "@tanstack/react-query";
import { useWalletSelector } from "../walletSelector";
import { vaultQueries, type TAsset } from "../queries/vault";
import { FLAT_LIST_TOKENS } from "../intents/constants/tokens";
import Big from "big.js";
import { queryClient } from "../queryClient";
import { intentsQueries } from "../queries/intents";
import { asyncTimerUtils } from "../utils/asyncTimerUtils";
import { dewAccountUtils } from "../utils/dewAccountUtils";
import type { ChainName } from "../stores/wallet_store";
import { DewAccountBackend } from "../backend/DewAccountBackend";

const useDepositToVaultMutation = () => {
  const { requestDeposit, signMessage } = useWalletSelector();
  return useMutation({
    mutationFn: async ({
      intentsDepositAddress,
      nearAddress,
      amount,
      asset,
      vaultContractId,
      exchangeRate,
      sharesDecimals,
      slippagePercent,
      blockchainAddress,
      chain,
    }: {
      intentsDepositAddress: string;
      // this is prettier amount
      // we need to calculate the amount without decimals internally
      nearAddress: string;
      amount: string;
      asset: TAsset;
      vaultContractId: string;
      exchangeRate: string;
      sharesDecimals: number;
      slippagePercent: string;
      blockchainAddress: string;
      chain: ChainName;
    }) => {
      console.log("Checking if storage deposited");
      const isStorageDepositedToVault = await queryClient.fetchQuery(
        vaultQueries.getCheckIsStorageDepositedQueryOptions({
          vaultContractId,
          nearAddress,
        })
      );

      if (!isStorageDepositedToVault) {
        console.log("Calling backend to sponsor storage deposit to this vault");
        await DewAccountBackend.storageDeposit({
          account_id: nearAddress,
          vault_id: vaultContractId,
        });
      }

      // TODO: handle FungibleToken
      let decimals: number | undefined = undefined;

      if ("FungibleToken" in asset) {
        throw new Error("FungibleToken is not supported yet");
      } else {
        const token_info = FLAT_LIST_TOKENS.find(
          (e) => e.defuseAssetId === asset.MultiToken.token_id
        );

        if (!token_info) {
          throw new Error("Unable to map the MultiToken");
        }

        decimals = token_info.decimals;
      }
      const depositAmount = BigInt(
        Big(amount).mul(Big(10).pow(decimals)).toFixed(0, Big.roundDown)
      );
      const minShares = Big(amount)
        .mul(Big(exchangeRate))
        .mul(Big(10).pow(sharesDecimals))
        .mul(Big(1 - Number(slippagePercent) / 100))
        .toFixed();

      console.log(depositAmount, "depositAmount");
      console.log(minShares, "minShares");
      await requestDeposit({
        asset,
        amount: depositAmount,
        receiver_address: intentsDepositAddress,
      });

      console.log("Deposited successfully");
      console.log("Pending intents to detect the deposit");
      // only MultiToken need this check
      // FungibleToken is immediate
      if ("MultiToken" in asset) {
        let fundsDetectedInIntents = false;
        while (!fundsDetectedInIntents) {
          const balance = await queryClient.fetchQuery(
            intentsQueries.getBalanceInIntentsQueryOptions({
              nearAddress: nearAddress,
              intentsTokenId: asset.MultiToken.token_id,
            })
          );

          console.log(
            `Balance in intents: ${balance}, expected: ${depositAmount.toString()}`
          );

          if (BigInt(balance) >= depositAmount) {
            fundsDetectedInIntents = true;
            console.log("Deposit detected in intents");
          } else {
            console.log("Wait for 5 seconds before rechecking");
            await asyncTimerUtils.waitSeconds(5);
          }
        }
      }

      console.log("Getting message to be signed via wallet");
      const transaction = {
        receiverId: "intents.near",
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "mt_transfer_call",
              args: {
                amount: depositAmount.toString(),
                token_id: asset.MultiToken.token_id,
                receiver_id: vaultContractId,
                msg: JSON.stringify({
                  min_shares: minShares,
                }),
              },
              gas: "30000000000000",
              deposit: "1",
            },
          },
        ],
      };

      const { message, blockchainId } =
        await dewAccountUtils.getMessageForSigningTransaction({
          nearAddress,
          transaction,
          chain,
          blockchainAddress,
        });

      console.log("Pending wallet sign");
      const signature = await signMessage(message);

      console.log("Pending backend to call the transaction");
      await DewAccountBackend.signTransaction({
        receiverId: nearAddress,
        args: {
          blockchain_address: blockchainAddress,
          blockchain_id: blockchainId,
          signature: signature,
          transaction,
        },
      });
      console.log("All done");
    },
  });
};

export const vaultMutations = {
  useDepositToVaultMutation,
};
