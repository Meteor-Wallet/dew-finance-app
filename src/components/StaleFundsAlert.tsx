import { useState } from "react";
import { X } from "lucide-react";
import { useStaleBalances } from "../hooks/useStaleBalances";
import { useWalletStore } from "../stores/wallet_store";
import { dewFactoryUtils } from "../utils/dewFactoryUtils";

export default function StaleFundsAlert() {
  const nearAccountId = useWalletStore((s) => s.nearAccountId);
  const { data: staleBalances } = useStaleBalances();
  const [dismissed, setDismissed] = useState(false);

  const isAbstractAccount = !!nearAccountId && dewFactoryUtils.isAbstractAccount(nearAccountId);
  if (!isAbstractAccount || staleBalances.length === 0 || dismissed) return null;

  const tokenList = staleBalances.map((b) => b.symbol).join(", ");

  return (
    <div className="relative z-10 flex items-center gap-3 px-4 py-3 bg-amber-950/80 border-b border-amber-600/50 text-amber-300 text-sm">
      <span className="shrink-0">⚠</span>
      <span className="flex-1">
        You have stale funds in your abstract account: <span className="font-semibold">{tokenList}</span>.
      </span>
      <button
        onClick={() => useWalletStore.getState().openWithdrawStaleFundsModal()}
        className="shrink-0 px-3 py-1 rounded-sm bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors"
      >
        Withdraw
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-400 hover:text-amber-200 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
