import nearLogo from "../../assets/near.svg";
import solanaLogo from "../../assets/solana.svg";
import ethLogo from "../../assets/eth.svg";
import arbLogo from "../../assets/arb.png";
import zecLogo from "../../assets/zec.svg";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { ChainName } from "../../stores/wallet_store";

export type ChainOption = {
  chain: ChainName;
  address: string | null;
  logo: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
};

export const CHAIN_META: Partial<Record<ChainName, { logo: string; label: string }>> = {
  near:     { logo: nearLogo,   label: "NEAR" },
  eth:      { logo: ethLogo,    label: "Ethereum" },
  arbitrum: { logo: arbLogo,    label: "Arbitrum" },
  solana:   { logo: solanaLogo, label: "Solana" },
  zec:      { logo: zecLogo,    label: "Zcash" },
};

export function ChainSelect({
  options,
  value,
  onChange,
  label,
}: {
  options: ChainOption[];
  value: ChainOption | null;
  onChange: (option: ChainOption) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="mb-5">
      {label && <p className="text-sm text-gray mb-2">{label}</p>}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-sm bg-input-background border border-card-border text-sm text-white"
        >
          {value ? (
            <>
              <img src={value.logo} alt={value.label} className="w-4 h-4" />
              <span>{value.label}</span>
            </>
          ) : (
            <span className="text-gray">Select chain</span>
          )}
          <ChevronDown
            size={14}
            className={`ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1 w-full bg-input-inner-background rounded-md shadow-lg z-10 overflow-hidden">
            {options.map((option) => (
              <div
                key={`${option.chain}-${option.address ?? option.chain}`}
                onClick={() => { if (!option.disabled) { onChange(option); setOpen(false); } }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  option.disabled
                    ? "opacity-40 cursor-not-allowed"
                    : "cursor-pointer hover:bg-input-focus"
                } ${value?.chain === option.chain ? "text-white" : "text-gray"}`}
              >
                <img src={option.logo} alt={option.label} className="w-4 h-4" />
                <span>{option.label}</span>
                {option.disabled && (
                  <span className="ml-auto text-xs">{option.disabledReason ?? "Not connected"}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
