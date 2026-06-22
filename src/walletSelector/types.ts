import type { ChainName } from "../stores/wallet_store";
import type { Connector } from "wagmi";

export interface ChainAdapter {
  chains: ChainName[];
  requestDeposit: (args: {
    contractAddress: string;
    amount: bigint;
    receiverAddress: string;
    decimals: number;
    chain: ChainName
  }) => Promise<string>;
  signIn: (options?: { walletName?: string; connector?: Connector }) => Promise<void>;
  signOut: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}
