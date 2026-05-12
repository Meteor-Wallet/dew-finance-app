import { NearConnector } from "@hot-labs/near-connect";
import { useWalletStore } from "./stores/wallet_store";

export const nearConnector = new NearConnector({
  network: "mainnet",
  autoConnect: true,
  features: {
    signAndSendTransaction: true,
    signAndSendTransactions: true,
    signInWithoutAddKey: true,
  }
});

nearConnector.on("wallet:signIn", ({ accounts, success }) => {
  if (!success) return;
  const accountId = accounts[0]?.accountId;
  if (!accountId) return;
  useWalletStore.getState().connectWallet({
    address: accountId,
    supportedChains: ["near"],
    selectedChain: "near",
  });
  useWalletStore.getState().setCurrentNearAccountId({ nearAccountId: accountId });
  useWalletStore.getState().closeConnectWalletModal();
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
