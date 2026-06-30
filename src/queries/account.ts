import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { readContract } from "wagmi/actions";
import { mainnet, arbitrum } from "wagmi/chains";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { vaultQueries, type TAsset } from "./vault";
import { intentsQueries } from "./intents";
import { oneClickUtils } from "../utils/1clickUtils";
import { useConnectedWalletAddress, useWalletStore } from "../stores/wallet_store";
import type { ChainName } from "../stores/wallet_store";
import { useShallow } from "zustand/react/shallow";
import { getNoirWallet } from "@noir-wallet/sdk";
import { nearUtils } from "../utils/nearUtils";
import Big from "big.js";
import { wagmiConfig } from "../evmConfig";
import { evmUtils } from "../utils/evmUtils";

const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const accountBalanceQueryKey = ({
  asset,
  address,
}: {
  asset: TAsset | null;
  address?: string;
}) => {
  return ["account", "balance", { asset, address }];
};

const useAccountBalance = ({
  asset,
  chain,
}: {
  asset: TAsset | null;
  chain?: ChainName | null;
}) => {
  const isNear = !chain || chain === "near";
  const isEvm =
    chain === "eth" ||
    chain === "arbitrum" ||
    chain === "monad" ||
    chain === "plasma" ||
    chain === "bsc" ||
    chain === "polygon";
  const isSolana = chain === "solana";
  const isZec = chain === "zec";

  const connectedWalletAddress = useConnectedWalletAddress();
  const { address: evmAddress } = useAccount();
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const zecAddress = useWalletStore(
    useShallow((s) => s.connectedWallets.find((w) => w.supportedChains.includes("zec"))?.address ?? null),
  );

  const nearContractId =
    asset && "FungibleToken" in asset ? asset.FungibleToken.contract_id : null;
  const blockchain = chain ? oneClickUtils.chainNameTo1ClickBlockchain(chain) : null;
  const sourceContractAddress =
    nearContractId && blockchain && blockchain !== "near"
      ? (oneClickUtils.tokenPairMap[nearContractId]?.[blockchain as "eth" | "arb" | "sol"] ?? null)
      : null;

  return useQuery({
    queryKey: [
      "account",
      "balance",
      chain ?? "near",
      isNear
        ? { asset, address: connectedWalletAddress?.address }
        : isEvm
          ? { sourceContractAddress, evmAddress }
          : isZec
            ? { zecAddress }
            : { sourceContractAddress, solanaAddress: publicKey?.toBase58() },
    ],
    queryFn: async ({ client }) => {
      if (isZec) {
        const noirWallet = getNoirWallet();
        if (!noirWallet) throw new Error("Noir Wallet not connected");
        const result = await noirWallet.zcash.getBalance();

        // Prefer 'available' (max transferable after fees) over total shielded balance
        const zecAmount = result.available ?? result.shielded;
        const ZEC_DECIMALS = 8;
        const balance = Big(zecAmount).mul(Big(10).pow(ZEC_DECIMALS)).toFixed(0);
        return { balance, decimals: ZEC_DECIMALS, formatted: zecAmount };
      }

      if (isNear) {
        if (!asset || !("FungibleToken" in asset) || !connectedWalletAddress) return undefined;

        let balance = await nearUtils.provider.callFunction<string>(
          asset.FungibleToken.contract_id,
          "ft_balance_of",
          { account_id: connectedWalletAddress.address },
        );

        if (!balance) throw new Error("Failed to fetch ft balance");

        if (asset.FungibleToken.contract_id === "wrap.near") {
          const account = await nearUtils.provider.viewAccount(connectedWalletAddress.address);
          const availableBalance = Big(account.amount.toString()).minus(
            Big("0.25").mul(Big(10).pow(24)),
          );
          if (availableBalance.gte(Big(0))) {
            balance = Big(balance).add(availableBalance).toFixed();
          }
        }

        const ftMetadata = await client.fetchQuery(
          vaultQueries.getFtMetadataQueryOptions({ tokenId: asset.FungibleToken.contract_id }),
        );

        return {
          balance,
          decimals: ftMetadata.decimals,
          formatted: Big(balance).div(Big(10).pow(ftMetadata.decimals)).toFixed(),
        };
      }

      // Resolve the source token (contract address + decimals) from the 1Click token list
      const tokens = await client.fetchQuery(intentsQueries.get1ClickTokens());
      const token = tokens.find(
        (t) => t.blockchain === blockchain && t.contractAddress?.toLowerCase() === sourceContractAddress!.toLowerCase(),
      );
      if (!token) throw new Error(`Token not found on ${blockchain} for this asset`);

      if (isEvm) {
        const chainId = evmUtils.chainToWagmiChainId(chain);
        const raw = await readContract(wagmiConfig, {
          address: token.contractAddress as `0x${string}`,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [evmAddress!],
          chainId,
        });
        return {
          balance: raw.toString(),
          decimals: token.decimals,
          formatted: Big(raw.toString()).div(Big(10).pow(token.decimals)).toFixed(),
        };
      }

      // Solana
      const mintPubkey = new PublicKey(token.contractAddress!);
      const ata = await getAssociatedTokenAddress(mintPubkey, publicKey!);
      try {
        const info = await connection.getTokenAccountBalance(ata);
        return {
          balance: info.value.amount,
          decimals: info.value.decimals,
          formatted: info.value.uiAmountString ?? "0",
        };
      } catch {
        // ATA doesn't exist yet — balance is zero
        return { balance: "0", decimals: token.decimals, formatted: "0" };
      }
    },
    enabled:
      (isNear && connectedWalletAddress !== null && asset !== null) ||
      (isEvm && !!sourceContractAddress && !!evmAddress) ||
      (isSolana && !!sourceContractAddress && !!publicKey) ||
      (isZec && !!zecAddress),
  });
};

export const accountQueries = {
  useAccountBalance,
  queryKey: {
    accountBalanceQueryKey,
  },
};
