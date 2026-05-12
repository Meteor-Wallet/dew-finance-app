import { useMutation } from "@tanstack/react-query";
import { vaultQueries, type TAsset } from "../queries/vault";
import Big from "big.js";
import { queryClient } from "../queryClient";
import { toast } from "sonner";
import { useVaultActionStore } from "../stores/vault_action_store";
import { useRef } from "react";
import { accountQueries } from "../queries/account";
import { nearConnector } from "../nearConnector";
import { nearUtils } from "../utils/nearUtils";
import type { ConnectorAction } from "@hot-labs/near-connect";

type FtMetadata = { decimals: number };

const ftCall = (
  methodName: string,
  args: object,
  deposit = "0",
  gas = "30000000000000",
): ConnectorAction => ({
  type: "FunctionCall",
  params: { methodName, args, gas, deposit },
});

const useDepositToVaultMutation = () => {
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
          address: params.blockchainAddress,
        }),
      });
      queryClient.invalidateQueries(
        vaultQueries.getMyPositionQueryOptions({
          vaultContractId: params.vaultContractId,
          nearAddress: params.nearAddress,
        }),
      );
      useVaultActionStore.getState().updateDepositAmount({ amount: "" });
      useVaultActionStore.getState().closeDepositWalletModal();
    },
    mutationFn: async ({
      nearAddress,
      amount,
      asset,
      vaultContractId,
      exchangeRate,
      sharesDecimals,
      slippagePercent,
    }: {
      nearAddress: string;
      amount: string;
      asset: TAsset;
      vaultContractId: string;
      exchangeRate: string;
      sharesDecimals: number;
      slippagePercent: string;
      blockchainAddress: string;
    }) => {
      if (!("FungibleToken" in asset)) {
        throw new Error("Only fungible token deposit is supported");
      }
      toastIdRef.current = toast.loading("Depositing", {
        description: "Making sure deposit amount is valid",
      });

      const { wallet } = await nearConnector.getConnectedWallet();

      toast.loading("Depositing", {
        description: "Checking if storage is deposited",
        id: toastIdRef.current,
      });
      const isStorageDepositedToVault = await queryClient.fetchQuery(
        vaultQueries.getCheckIsStorageDepositedQueryOptions({
          vaultContractId,
          nearAddress,
        }),
      );

      const actions: ConnectorAction[] = [];

      if (!isStorageDepositedToVault) {
        actions.push(
          ftCall(
            "storage_deposit",
            {
              account_id: nearAddress,
              registration_only: true,
            },
            "12500000000000000000000",
          ),
        );
      }

      const contractId = asset.FungibleToken.contract_id;
      const { decimals } = (await nearUtils.provider.callFunction(
        contractId,
        "ft_metadata",
        {},
      )) as FtMetadata;

      const depositAmountStr = Big(amount)
        .mul(Big(10).pow(decimals))
        .toFixed(0, Big.roundDown);
      const minShares = Big(amount)
        .mul(Big(exchangeRate))
        .mul(Big(10).pow(sharesDecimals))
        .mul(Big(1 - Number(slippagePercent) / 100))
        .toFixed(0, Big.roundDown);

      toast.loading("Depositing", {
        description: "Waiting for wallet approval",
        id: toastIdRef.current,
      });
      actions.push(
        ftCall(
          "ft_transfer_call",
          {
            receiver_id: vaultContractId,
            amount: depositAmountStr,
            msg: JSON.stringify({ min_shares: minShares, is_request: false }),
          },
          "1",
          "300000000000000",
        ),
      );
      await wallet.signAndSendTransaction({
        receiverId: contractId,
        actions,
      });

      toast.success("Depositing", {
        description: "Successfully deposited!",
        id: toastIdRef.current,
      });
    },
  });
};

const useWithdrawFromVaultMutation = () => {
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
        }),
      );
      useVaultActionStore.getState().updateWithdrawAmount({ amount: "" });
      useVaultActionStore.getState().closeRedeemWalletModal();
    },
    mutationFn: async ({
      share,
      asset,
      assetDecimals,
      exchangeRate,
      shareDecimals,
      slippagePercent,
      vaultContractId,
      nearAddress,
    }: {
      asset: TAsset;
      share: string;
      slippagePercent: string;
      exchangeRate: string;
      assetDecimals: number;
      shareDecimals: number;
      vaultContractId: string;
      nearAddress: string;
    }) => {
      if (!("FungibleToken" in asset)) {
        throw new Error("Only fungible token withdrawal is supported");
      }
      const expectedAssetAmount = Big(share)
        .mul(exchangeRate)
        .mul(Big(10).pow(assetDecimals));

      const minimumAssetAmount = expectedAssetAmount.mul(
        Big(1 - Number(slippagePercent) / 100),
      );

      toastIdRef.current = toast.loading("Withdrawing", {
        description: "Making sure the withdrawal amount is valid",
      });

      const shareAmountStr = Big(share)
        .mul(Big(10).pow(shareDecimals))
        .toFixed(0, Big.roundDown);

      toast.loading("Withdrawing", {
        description: "Checking if storage is deposited",
        id: toastIdRef.current,
      });

      const { wallet } = await nearConnector.getConnectedWallet();

      const isStorageDepositedToWithdrawalToken = await queryClient.fetchQuery(
        vaultQueries.getCheckIsStorageDepositedQueryOptions({
          vaultContractId: asset.FungibleToken.contract_id,
          nearAddress,
        }),
      );

      const transactions: {
        receiverId: string;
        actions: ConnectorAction[];
      }[] = [];

      if (!isStorageDepositedToWithdrawalToken) {
        transactions.push({
          actions: [
            ftCall(
              "storage_deposit",
              {
                account_id: nearAddress,
                registration_only: true,
              },
              "12500000000000000000000",
            ),
          ],
          receiverId: asset.FungibleToken.contract_id,
        });
      }

      toast.loading("Withdrawing", {
        description: "Redeeming shares from vault",
        id: toastIdRef.current,
      });
      transactions.push({
        actions: [
          ftCall("redeem", {
            shares: shareAmountStr,
            asset,
            min_asset_amount: minimumAssetAmount.toFixed(0, Big.roundDown),
          }, "1", "300000000000000"),
        ],
        receiverId: vaultContractId,
      });
      await wallet.signAndSendTransactions({
        transactions,
      });
      // FungibleToken: vault sends directly to NEAR wallet, no extra step needed

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
