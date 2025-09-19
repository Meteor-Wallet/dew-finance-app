import { useMutation } from "@tanstack/react-query";
import { useWalletSelector } from "../walletSelector";
import { vaultQueries, type TAsset } from "../queries/vault";
import { FLAT_LIST_TOKENS } from "../intents/constants/tokens";
import Big from "big.js";
import { queryClient } from "../queryClient";
import { intentsQueries } from "../queries/intents";
import { asyncTimerUtils } from "../utils/asyncTimerUtils";
import { dewAccountUtils } from "../utils/dewAccountUtils";
import { type ChainName } from "../stores/wallet_store";
import { DewAccountBackend } from "../backend/DewAccountBackend";
import { toast } from "sonner";
import { vaultActionStore } from "../stores/vault_action_store";
import { useRef } from "react";
import { accountQueries } from "../queries/account";

const useDepositToVaultMutation = () => {
  const { requestDeposit, signMessage } = useWalletSelector();

  const toastIdRef = useRef<number | string>(undefined);

  return useMutation({
    onError: (error) => {
      toast.error("Something went wrong", {
        description: error.message,
        id: toastIdRef.current,
      });
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({
        queryKey: accountQueries.queryKey.accountBalanceQueryKey({
          asset: params.asset,
          selectedChain: params.chain,
          address: params.blockchainAddress,
        }),
      });
      vaultActionStore.store.trigger.updateDepositAmount({ amount: "" });
    },
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
      toastIdRef.current = toast.loading("Depositing", {
        description: "Making sure deposit amount is valid",
      });

      if ("MultiToken" in asset) {
        const intentsSupportedTokens = await queryClient.fetchQuery(
          intentsQueries.getSupportedTokensQueryOptions()
        );

        const tokenInfo = intentsSupportedTokens.tokens.find(
          (e) => e.intents_token_id === asset.MultiToken.token_id
        );

        if (!tokenInfo) {
          throw new Error(
            "Unable to map token minimum deposit, please try again later"
          );
        }

        if (
          Big(amount)
            .mul(Big(10).pow(tokenInfo.decimals))
            .lte(Big(tokenInfo.min_deposit_amount))
        ) {
          throw new Error(
            `Minimum deposit is ${Big(tokenInfo.min_deposit_amount)
              .div(Big(10).pow(tokenInfo.decimals))
              .toFixed()}`
          );
        }
      }

      toast.loading("Depositing", {
        description: "Checking if storage is deposited",
        id: toastIdRef.current,
      });

      const isStorageDepositedToVault = await queryClient.fetchQuery(
        vaultQueries.getCheckIsStorageDepositedQueryOptions({
          vaultContractId,
          nearAddress,
        })
      );

      if (!isStorageDepositedToVault) {
        toast.loading("Depositing", {
          description: "Sponsoring storage deposit",
          id: toastIdRef.current,
        });
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
      toast.loading("Depositing", {
        description: "Requesting deposit in wallet selector",
        id: toastIdRef.current,
      });
      await requestDeposit({
        asset,
        amount: depositAmount,
        receiver_address: intentsDepositAddress,
      });

      toast.loading("Depositing", {
        description: "Awaiting funds to be detected (This may take a minute)",
        id: toastIdRef.current,
      });
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

      toast.loading("Depositing", {
        description:
          "Generating message to be signed for publishing transaction",
        id: toastIdRef.current,
      });
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

      toast.loading("Depositing", {
        description: "Requesting wallet selector to sign the message",
        id: toastIdRef.current,
      });
      const signature = await signMessage(message);

      toast.loading("Depositing", {
        description: "Publishing transaction",
        id: toastIdRef.current,
      });
      await DewAccountBackend.signTransaction({
        receiverId: nearAddress,
        args: {
          blockchain_address: blockchainAddress,
          blockchain_id: blockchainId,
          signature: signature,
          transaction,
        },
      });
      toast.success("Depositing", {
        description: "Successfully deposited!",
        id: toastIdRef.current,
      });
    },
  });
};

const useWithdrawFromVaultMutation = () => {
  const { signMessage } = useWalletSelector();

  const toastIdRef = useRef<number | string>(undefined);

  return useMutation({
    onError: (error) => {
      toast.error("Something went wrong", {
        description: error.message,
        id: toastIdRef.current,
      });
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries(
        vaultQueries.getMyPositionQueryOptions({
          vaultContractId: params.vaultContractId,
          nearAddress: params.nearAddress,
        })
      );
      vaultActionStore.store.trigger.updateWithdrawAmount({ amount: "" });
    },
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

      // make sure the intents token is starting with nep141:
      // nep245: is not supported yet

      if ("MultiToken" in asset) {
        if (!asset.MultiToken.token_id.startsWith("nep141:")) {
          throw new Error(
            `Token (${asset.MultiToken.token_id}) not supported at the moment.`
          );
        }
      }

      const expectedAssetAmount = Big(share)
        .mul(exchangeRate)
        .mul(Big(10).pow(assetDecimals));

      const minimumAssetAmount = expectedAssetAmount.mul(
        Big(1 - Number(slippagePercent) / 100)
      );

      toastIdRef.current = toast.loading("Withdrawing", {
        description: "Making sure the withdrawal amount is valid",
      });

      if ("MultiToken" in asset) {
        const intentsSupportedTokens = await queryClient.fetchQuery(
          intentsQueries.getSupportedTokensQueryOptions()
        );

        const tokenInfo = intentsSupportedTokens.tokens.find(
          (e) => e.intents_token_id === asset.MultiToken.token_id
        );

        if (!tokenInfo) {
          throw new Error(
            "Unable to map token minimum withdrawal, please try again later"
          );
        }

        // add both of these to make sure withdrawal is not exhausted
        const withdrawalCost = Big(tokenInfo.min_withdrawal_amount).add(
          Big(tokenInfo.withdrawal_fee)
        );

        if (expectedAssetAmount.lte(withdrawalCost)) {
          throw new Error(
            `Minimum withdrawal is ${withdrawalCost
              .div(Big(10).pow(tokenInfo.decimals))
              .toFixed()}`
          );
        }
      }

      toast.loading("Withdrawing", {
        description:
          "Generating message to be signed for publishing transaction - redeem",
        id: toastIdRef.current,
      });
      console.log(toastIdRef.current);
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

      toast.loading("Withdrawing", {
        description: "Requesting wallet selector to sign the message - redeem",
        id: toastIdRef.current,
      });
      const redeemSignature = await signMessage(redeemMessage);

      toast.loading("Withdrawing", {
        description: "Publishing transaction - redeem",
        id: toastIdRef.current,
      });
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
        toast.loading("Withdrawing", {
          description: "Reading balance in abstract account after redeeming",
          id: toastIdRef.current,
        });
        const balance = await queryClient.fetchQuery(
          intentsQueries.getBalanceInIntentsQueryOptions({
            nearAddress: nearAddress,
            intentsTokenId: asset.MultiToken.token_id,
          })
        );

        toast.loading("Withdrawing", {
          description:
            "Generating message to be signed for publishing transaction - withdraw",
          id: toastIdRef.current,
        });
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

        toast.loading("Withdrawing", {
          description:
            "Requesting wallet selector to sign the message - withdraw",
          id: toastIdRef.current,
        });
        const withdrawSignature = await signMessage(withdrawMessage);

        toast.loading("Withdrawing", {
          description: "Publishing transaction - withdraw",
          id: toastIdRef.current,
        });
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
      toast.success("Withdrawing", {
        description: "Withdraw successfully",
        id: toastIdRef.current,
      });
    },
  });
};

export const vaultMutations = {
  useDepositToVaultMutation,
  useWithdrawFromVaultMutation,
};
