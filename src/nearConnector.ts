import { NearConnector } from "@hot-labs/near-connect";
import { useWalletStore } from "./stores/wallet_store";
import type { Account } from "@hot-labs/near-connect/build/types";

export const nearConnector = new NearConnector({
  network: "mainnet",
  autoConnect: true,
  features: {
    signAndSendTransaction: true,
    signAndSendTransactions: true,
    signInWithoutAddKey: true,
  },
  storage: {
    get: async (key) => {
      return localStorage.getItem(`near-connector:${key}`);
    },
    set: async (key, value) => {
      localStorage.setItem(`near-connector:${key}`, value);
    },
    remove: async (key) => {
      localStorage.removeItem(`near-connector:${key}`);
    },
  },
});

const onConnected = (accounts: Account[]) => {
  const accountId = accounts[0]?.accountId;
  if (!accountId) return;
  useWalletStore.getState().connectWallet({
    address: accountId,
    supportedChains: ["near"],
    selectedChain: "near",
  });
  useWalletStore.getState().setCurrentNearAccountId({ nearAccountId: accountId });
  useWalletStore.getState().closeConnectWalletModal();
}

nearConnector.getConnectedWallet().then(wallet => {
  onConnected(wallet.accounts)
})

nearConnector.on("wallet:signIn", ({ accounts, success }) => {
  if (!success) return;
  onConnected(accounts)
});

nearConnector.on("wallet:signOut", () => {
  const { connectedWallets } = useWalletStore.getState();
  const nearWallet = connectedWallets.find((w) => w.supportedChains.includes("near"));
  if (nearWallet) {
    useWalletStore.setState({
      connectedWallets: connectedWallets.filter((w) => !w.supportedChains.includes("near")),
    });
  }
});
