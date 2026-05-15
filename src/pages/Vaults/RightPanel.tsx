import { memo, useEffect, useMemo, useState } from "react";
import Near from "../../assets/near.png";
import Motion from "../../components/utils/Motion";
import FeeIcon1 from "../../assets/fee_icon1.svg";
import FeeIcon2 from "../../assets/fee_icon2.svg";
import vaultIcon from "../../assets/vault-icon.png";
import { motion, AnimatePresence } from "framer-motion";
import DewChart from "../../components/sample/DewChart";
import DewChart2 from "../../components/sample/DewChart2";
import { ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { Link, useParams, useSearchParams } from "react-router-dom";
import TransactionTable from "../../components/sample/TransactionTable";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { vaultQueries } from "../../queries/vault";
import clsx from "clsx";
import { vaultUtils } from "../../utils/vaultUtils";
import { assetUtils } from "../../utils/assetUtils";
import { stringUtils } from "../../utils/stringUtils";
import Big from "big.js";

// ─── Tab Components ───────────────────────────────────────────────────────────

const OverviewTab = ({ vaultContractId }: { vaultContractId: string }) => {
  const baseAssetQuery = useQuery({
    ...vaultQueries.getVaultBaseAssetQueryOptions({ vaultContractId }),
  });

  const latestBlockInfoQuery = useQuery({
    ...vaultQueries.getLatestBlockinfoQueryOptions(),
  });

  const blockIds = useMemo(() => {
    const totalInterval = 5;
    const balanceIntervalInHours = 0.5;
    const averageBlockTimeInSeconds = 0.6;
    const blockHeightInterval = Math.floor(
      (balanceIntervalInHours * 3600) / averageBlockTimeInSeconds,
    );
    if (!latestBlockInfoQuery.data) return [];
    const currentHeight = Number(latestBlockInfoQuery.data.header.height);
    const ids: number[] = [];
    for (let i = totalInterval; i > 0; i--) {
      ids.push(currentHeight - blockHeightInterval * i);
    }
    return ids;
  }, [latestBlockInfoQuery.data]);

  const sharePricesByBlockIdsQuery = useQueries({
    queries: blockIds.map((blockId) => ({
      ...vaultQueries.getHistoricalSharePriceQueryOptions({
        blockId,
        vaultContractId,
        asset: baseAssetQuery.data!,
      }),
      enabled: baseAssetQuery.data !== undefined,
    })),
  });

  const blockIdInfoQuery = useQueries({
    queries: blockIds.map((blockId) => ({
      ...vaultQueries.getBlockinfoQueryOptions(blockId),
    })),
  });

  const balanceByBlockIdsQuery = useQueries({
    queries: blockIds.map((blockId) => ({
      ...vaultQueries.getHistoricalBalanceQueryOptions({
        blockId,
        vaultContractId,
        asset: baseAssetQuery.data!,
      }),
      enabled: baseAssetQuery.data !== undefined,
    })),
  });

  const vaultConfig = useMemo(
    () => vaultUtils.vaults.find((v) => v.vault_id === vaultContractId),
    [vaultContractId],
  );

  const sharePriceDetails = useMemo(() => {
    if (!vaultConfig) return undefined;
    if (
      sharePricesByBlockIdsQuery.every((q) => q.data !== undefined) &&
      blockIdInfoQuery.every((q) => q.data !== undefined)
    ) {
      const chart = sharePricesByBlockIdsQuery.map((q, i) => {
        const blockInfo = blockIdInfoQuery[i].data!;
        return {
          date: new Date(blockInfo.header.timestamp / 1000000).toLocaleString(),
          value: Big(q.data).div(Big(10).pow(vaultConfig.share_price_decimals)).toNumber(),
        };
      });
      const latestSharePrice = chart.length ? chart[chart.length - 1].value.toString() : "0";
      return { chart, latestSharePrice };
    }
  }, [blockIdInfoQuery, sharePricesByBlockIdsQuery, vaultConfig]);

  const balanceDetails = useMemo(() => {
    if (!vaultConfig) return undefined;
    if (
      balanceByBlockIdsQuery.every((q) => q.data !== undefined) &&
      blockIdInfoQuery.every((q) => q.data !== undefined)
    ) {
      const chart = balanceByBlockIdsQuery.map((q, i) => {
        const blockInfo = blockIdInfoQuery[i].data!;
        return {
          date: new Date(blockInfo.header.timestamp / 1000000).toLocaleString(),
          value: Big(q.data).div(Big(10).pow(vaultConfig.share_price_decimals)).toNumber(),
        };
      });
      const latestCurrentTotal = chart.length ? chart[chart.length - 1].value : 0;
      return { chart, latestCurrentTotal };
    }
  }, [blockIdInfoQuery, balanceByBlockIdsQuery, vaultConfig]);

  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset: baseAssetQuery.data ?? null,
  });

  const vaultMeta = vaultUtils.vaults.find((v) => v.vault_id === vaultContractId);

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="space-y-6">
        {/* Vault Heading */}
        <div className="flex items-center gap-4">
          <div className="w-[50px] h-[50px] relative">
            <img src={vaultIcon} />
            <img src={Near} className="absolute bottom-[-5px] right-[-5px] w-[25px] h-[25px]" />
          </div>
          <div>
            <h2 className="font-semibold text-2xl">{vaultMeta?.name ?? "—"}</h2>
            <p className="text-base text-gray font-light mt-[-2px]">
              Curated by {vaultMeta?.curated_by ?? "—"}
            </p>
          </div>
        </div>

        {vaultMeta?.description && (
          <div className="mt-8">
            <p className="text-base text-white mb-2">Description</p>
            <p className="text-sm text-gray">{vaultMeta.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-base text-white mb-2">Benchmark Assets</p>
            <div className="flex gap-1.5 items-center">
              <img src={assetIcon} alt={assetSymbol} className="w-6 h-6" />
              <p className="text-base text-gray">{assetSymbol}</p>
            </div>
          </div>
        </div>

        <hr className="border-t border-border-color mt-9 mb-9" />

        {/* TVL Graph */}
        <p className="text-base text-white mb-4">Total Value Locked Overview</p>
        <div className="relative w-full h-full rounded-lg">
          <div className="p-4 rounded-lg">
            <div className="flex lg:flex-row flex-col justify-between lg:gap-0 gap-5 lg:items-center mb-2">
              <div className="flex gap-3 items-center">
                <img src={assetIcon} alt={assetSymbol} className="w-12 h-12" />
                <div>
                  <h3 className="text-3xl font-semibold">
                    {stringUtils.truncateDecimals(balanceDetails?.latestCurrentTotal)} {assetSymbol}
                  </h3>
                </div>
              </div>
            </div>
            <div className="h-[400px] ml-[-6%] w-[108%] to-transparent rounded">
              <DewChart data={balanceDetails?.chart || []} />
            </div>
          </div>
        </div>

        <hr className="border-t border-border-color mt-9 mb-9" />

        {/* Share Price Graph */}
        <p className="text-base text-white mb-4">Share Price History Overview</p>
        <div className="relative w-full h-full rounded-lg">
          <div className="p-4 rounded-lg">
            <div className="flex lg:flex-row flex-col justify-between lg:gap-0 gap-5 lg:items-center mb-2">
              <div className="flex gap-3 items-center">
                <img src={assetIcon} alt={assetSymbol} className="w-12 h-12" />
                <div>
                  <h3 className="text-3xl font-semibold">
                    {sharePriceDetails?.latestSharePrice} {assetSymbol}
                  </h3>
                </div>
              </div>
            </div>
            <div className="h-[400px] ml-[-6%] w-[108%] to-transparent rounded">
              <DewChart2 data={sharePriceDetails?.chart || []} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const VaultSettingsTab = ({ vaultContractId }: { vaultContractId: string }) => {
  const [hoverAddress, setHoverAddress] = useState<string | null>(null);

  const vaultConfigQuery = useQuery({
    ...vaultQueries.getVaultConfigQueryOptions({ vaultContractId }),
  });
  const allRoleAssignmentsQuery = useQuery({
    ...vaultQueries.getAllRoleAssignmentsQueryOptions({ vaultContractId }),
  });
  const policyCountQuery = useQuery({
    ...vaultQueries.getPolicyCountQueryOptions({ vaultContractId }),
  });
  const allPoliciesQuery = useInfiniteQuery({
    ...vaultQueries.getAllPoliciesInfiniteQueryOptions({ vaultContractId }),
  });

  const managementFee = vaultConfigQuery.data?.management_fee_bps
    ? vaultConfigQuery.data.management_fee_bps / 100
    : 0;
  const performanceFee = vaultConfigQuery.data?.performance_fee_bps
    ? vaultConfigQuery.data.performance_fee_bps / 100
    : 0;

  const roleData = allRoleAssignmentsQuery.data ?? [];
  const totalPolicy = policyCountQuery.data ?? 0;

  const policies = useMemo(() => {
    const flatten = allPoliciesQuery.data?.pages.flat() ?? [];
    return flatten.slice(0, 5);
  }, [allPoliciesQuery.data]);

  return (
    <motion.div
      key="vault settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="space-y-6">
        {/* Vault Fees */}
        <div className="flex justify-between items-center mb-2">
          <p className="text-base text-white">Vault Fee</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 mt-3">
          <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-5 py-7 rounded-md border border-dark-border-color flex justify-between">
            <div>
              <p className="text-sm text-gray">Management fee</p>
              <p className="text-3xl font-semibold">{managementFee}%</p>
            </div>
            <img src={FeeIcon1} className="h-[60px]" />
          </div>
          <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-4 py-7 rounded-md border border-dark-border-color flex justify-between">
            <div>
              <p className="text-sm text-gray">Performance fee</p>
              <p className="text-3xl font-semibold">{performanceFee}%</p>
            </div>
            <img src={FeeIcon2} className="h-[60px]" />
          </div>
        </div>

        <hr className="border-t border-border-color mt-9 mb-9" />

        {/* Roles */}
        <div className="flex justify-between items-center mb-2">
          <p className="text-base text-white">Roles</p>
          <p className="text-sm text-gray">
            Total {roleData.length} {roleData.length > 1 ? "Roles" : "Role"}
          </p>
        </div>
        <div className="space-y-2">
          {roleData.map((role, i) => {
            const isFirst = i === 0;
            const isLast = i === roleData.length - 1;
            return (
              <div
                key={i}
                className={`flex justify-between p-4 border border-dark-border-color bg-[#0b0b0d] mb-0
                  ${isFirst ? "rounded-t-md" : ""} ${isLast ? "rounded-b-md border-b-0" : ""}`}
              >
                <div>
                  <p className="text-sm font-medium" style={{ textTransform: "capitalize" }}>
                    {role.role}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  {role.addresses.map((addr, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-end space-x-2 cursor-pointer p-1 px-2 transition-colors duration-200 ${
                        hoverAddress === addr ? "bg-input-focus rounded" : ""
                      }`}
                      onMouseEnter={() => setHoverAddress(addr)}
                      onMouseLeave={() => setHoverAddress(null)}
                    >
                      <a
                        href={`https://nearblocks.io/address/${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray truncate max-w-[250px] underline"
                      >
                        {addr}
                      </a>
                      <Copy
                        className="cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(addr);
                          toast.success("Wallet Address copied!");
                        }}
                        size={14}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <hr className="border-t border-border-color mt-9 mb-9" />

        {/* Policies */}
        <div className="flex justify-between items-center mb-2">
          <p className="text-base text-white">Policy</p>
          <p className="text-sm text-gray">Total {totalPolicy} Policies</p>
        </div>
        {policies.map((policy, idx) => {
          const currentTime = new Date().getTime();
          const activationTimeMs = Math.floor(Number(policy.activation_time) / 1e6);
          const isActive = activationTimeMs <= currentTime;
          return (
            <Link key={idx} to={`/${vaultContractId}/policy`}>
              <div className="bg-[#0b0b0d] p-4 py-5 rounded-md border border-dark-border-color mb-3 flex justify-between items-center cursor-pointer transition-all duration-200 hover:bg-input-background">
                <div>
                  <p className="text-base font-semibold">{policy.id}</p>
                  <p className="text-sm text-gray">{policy.description}</p>
                </div>
                <span
                  className={clsx(
                    "px-2 py-1 text-xs font-semibold rounded-full",
                    isActive ? "text-green-800 bg-green-200" : "text-red-800 bg-red-200",
                  )}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </Link>
          );
        })}
        <Link to={`/${vaultContractId}/policy`}>
          <div className="flex justify-end items-center gap-2 mt-4 group">
            <button className="text-sm text-primary group-hover:opacity-70">
              View All Policies
            </button>
            <ArrowRight
              className="text-primary transform transition-transform duration-300 group-hover:opacity-70 group-hover:translate-x-1"
              size={16}
            />
          </div>
        </Link>
      </div>
    </motion.div>
  );
};

const AllActivitiesTab = () => {
  return (
    <motion.div
      key="all activities"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="space-y-6">
        <div className="relative w-full h-full rounded-lg">
          <div className="blur-sm">
            <TransactionTable />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray text-xl font-semibold">Coming Soon</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── RightPanel ───────────────────────────────────────────────────────────────

const TABS = ["overview", "vault settings", "all activities"] as const;
type TTab = (typeof TABS)[number];

const RightPanel = memo(() => {
  const { vaultContractId } = useParams<{ vaultContractId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const rightTab = (searchParams.get("tab") ?? "overview") as TTab;

  useEffect(() => {
    const isLarge = window.matchMedia("(min-width: 1024px)").matches;
    if (isLarge) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      document.getElementById("leftPanelSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [rightTab]);

  return (
    <div className="w-[calc(100%+_10vw)] ml-[-5vw] lg:ml-0 h-full lg:w-2/3 lg:order-1 order-2">
      <Motion direction="left" duration={0.6} delay={0.3}>
        <div
          className="w-full h-full bg-[linear-gradient(139deg,#000000,#0C0C0C)] rounded-2xl shadow-lg space-y-6 border border-dark-border-color min-h-[90vh] mb-[100px]"
          id="leftPanelSection"
        >
          {/* Tabs */}
          <div className="p-6 pb-1 sticky top-0 z-9 bg-black/10 backdrop-blur-sm rounded-2xl">
            <div className="flex bg-tab-background rounded-sm mb-6 overflow-hidden">
              {TABS.map((t) => {
                const isActive = rightTab === t;
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setSearchParams((prev) => {
                        prev.set("tab", t);
                        return prev;
                      })
                    }
                    className="relative w-1/2 py-2.5 text-base capitalize font-medium duration-300 hover:opacity-50 transition"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="rightActiveTab"
                        className="absolute inset-0 bg-tab-button-background rounded-sm"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? "text-black font-bold" : "text-gray"}`}>
                      {t}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6 pt-0">
            <AnimatePresence mode="wait">
              {rightTab === "overview" && <OverviewTab vaultContractId={vaultContractId!} />}
              {rightTab === "vault settings" && <VaultSettingsTab vaultContractId={vaultContractId!} />}
              {rightTab === "all activities" && <AllActivitiesTab />}
            </AnimatePresence>
          </div>
        </div>
      </Motion>
    </div>
  );
});

export default RightPanel;
