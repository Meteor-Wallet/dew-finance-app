import { useMutation, useQuery } from "@tanstack/react-query";
import { useWalletSelector } from "../walletSelector";
import { vaultQueries, type TAsset } from "../queries/vault";
import { FLAT_LIST_TOKENS } from "../intents/constants/tokens";
import Big from "big.js";
import { queryClient } from "../queryClient";
import { intentsQueries } from "../queries/intents";
import { asyncTimerUtils } from "../utils/asyncTimerUtils";
import { dewAccountUtils } from "../utils/dewAccountUtils";
import { walletStore, type ChainName } from "../stores/wallet_store";
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

const useWithdrawFromVaultMutation = () => {
  const { signMessage } = useWalletSelector();

  return useMutation({
    mutationFn: async ({
      share,
      asset,
      assetDecimals,
      exchangeRate,
      shareDecimals,
      slippagePercent,
      withdrawToAddress,
      nearAddress,
      vaultContractId,
      chain,
      blockchainAddress,
    }: {
      withdrawToAddress: string;
      asset: TAsset;
      share: string;
      slippagePercent: string;
      exchangeRate: string;
      assetDecimals: number;
      shareDecimals: number;
      vaultContractId: string;
      nearAddress: string;
      blockchainAddress: string;
      chain: ChainName;
    }) => {
      // withdraw now
      // user must've gone through deposit before
      // so their account's storage for the vault should be deposited
      // we skip the storage deposit check here

      const expectedAssetAmount = Big(share)
        .mul(exchangeRate)
        .mul(Big(10).pow(assetDecimals));

      const minimumAssetAmount = expectedAssetAmount.mul(
        Big(1 - Number(slippagePercent) / 100)
      );

      console.log("Getting message to be signed via wallet - redeem");
      const redeemTransaction = {
        receiverId: vaultContractId,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "redeem",
              args: {
                shares: Big(share)
                  .mul(Big(10).pow(shareDecimals))
                  .toFixed(0, Big.roundDown),
                asset,
                min_assets: minimumAssetAmount.toFixed(0, Big.roundDown),
              },
              gas: "30000000000000",
              deposit: "1",
            },
          },
        ],
      };

      const { message: redeemMessage, blockchainId } =
        await dewAccountUtils.getMessageForSigningTransaction({
          nearAddress,
          transaction: redeemTransaction,
          chain,
          blockchainAddress,
        });

      console.log("Pending wallet sign - redeem");
      const redeemSignature = await signMessage(redeemMessage);

      console.log("Pending backend to call the transaction - redeem");
      await DewAccountBackend.signTransaction({
        receiverId: nearAddress,
        args: {
          blockchain_address: blockchainAddress,
          blockchain_id: blockchainId,
          signature: redeemSignature,
          transaction: redeemTransaction,
        },
      });

      if ("MultiToken" in asset) {
        console.log("mt_tokens should be arrived in the abstract account now");
        console.log("lets call another transaction to withdraw it");

        console.log(
          "Checking balance in intents, we will use this amount and withdrawing all of them"
        );
        const balance = await queryClient.fetchQuery(
          intentsQueries.getBalanceInIntentsQueryOptions({
            nearAddress: nearAddress,
            intentsTokenId: asset.MultiToken.token_id,
          })
        );

        console.log("Getting message to be signed via wallet - ft_withdraw");
        const tokenId = asset.MultiToken.token_id.replace("nep141:", "");
        const withdrawTransaction = {
          receiverId: "intents.near",
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "ft_withdraw",
                args: {
                  memo: `WITHDRAW_TO:${withdrawToAddress}`,
                  amount: balance,
                  token: tokenId,
                  receiver_id: tokenId,
                },
                gas: "30000000000000",
                deposit: "1",
              },
            },
          ],
        };

        const { message: withdrawMessage, blockchainId } =
          await dewAccountUtils.getMessageForSigningTransaction({
            nearAddress,
            transaction: withdrawTransaction,
            chain,
            blockchainAddress,
          });

        console.log("Pending wallet sign - ft_withdraw");
        const withdrawSignature = await signMessage(withdrawMessage);

        console.log("Pending backend to call the transaction - ft_withdraw");
        await DewAccountBackend.signTransaction({
          receiverId: nearAddress,
          args: {
            blockchain_address: blockchainAddress,
            blockchain_id: blockchainId,
            signature: withdrawSignature,
            transaction: withdrawTransaction,
          },
        });
      }
      console.log("ALL DONE");
    },
  });
};

export const vaultMutations = {
  useDepositToVaultMutation,
  useWithdrawFromVaultMutation
};
