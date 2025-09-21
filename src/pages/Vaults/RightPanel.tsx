import { memo, useEffect, useMemo, useState } from "react";
import Arb from "../../assets/arb.png";
import Btc from "../../assets/btc.png";
import Dai from "../../assets/dai-full.svg";
import Near from "../../assets/near.png";
import Motion from "../../components/utils/Motion";
import FeeIcon1 from "../../assets/fee_icon1.svg";
import FeeIcon2 from "../../assets/fee_icon2.svg";
import { motion, AnimatePresence } from "framer-motion";
import DewChart from "../../components/sample/DewChart";
import AllocationDonut from "../../components/sample/AllocationDonut";
import DewChart2 from "../../components/sample/DewChart2";
import { ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import TransactionTable from "../../components/sample/TransactionTable";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { vaultQueries } from "../../queries/vault";
import clsx from "clsx";
import { vaultUtils } from "../../utils/vaultUtils";
import { assetUtils } from "../../utils/assetUtils";
import { stringUtils } from "../../utils/stringUtils";
import Big from "big.js";

const RightPanel = memo(() => {
  const [searchParams] = useSearchParams({
    vaultContractId: vaultUtils.DEFAULT_VAULT_CONTRACT_ID,
  });

  const vaultContractId = searchParams.get("vaultContractId");

  const [hoverAddress, setHoverAddress] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState("overview");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [rightTab]);

  const vaultConfigQuery = useQuery({
    ...vaultQueries.getVaultConfigQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });
  const allRoleAssignmentsQuery = useQuery({
    ...vaultQueries.getAllRoleAssignmentsQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });
  const policyCountQuery = useQuery({
    ...vaultQueries.getPolicyCountQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });
  const allPoliciesQuery = useInfiniteQuery({
    ...vaultQueries.getAllPoliciesInfiniteQueryOptions({
      vaultContractId: vaultContractId!,
      limit: 5,
    }),
    enabled: vaultContractId !== null,
  });

  const baseAssetQuery = useQuery({
    ...vaultQueries.getVaultBaseAssetQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

  const balanceDistributionQuery = useQuery({
    ...vaultQueries.getVaultBalanceDistributionQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
    // to mock the pie chart data
    // select: (data) => {
    //   return data.map((v, idx) => {
    //     return {
    //       ...v,
    //     amount: v.amount + idx * 100
    //     }
    //   })
    // }
  });

  const historicalBalanceQuery = useQuery({
    ...vaultQueries.getHistoricalBalanceQueryOptions({
      vaultContractId: vaultContractId!,
      limit: 10,
      numberOf30MinsInterval: "1",
    }),
    enabled: vaultContractId !== null,
  });

  const historicalSharePriceQuery = useQuery({
    ...vaultQueries.getHistoricalSharePriceQueryOptions({
      vaultContractId: vaultContractId!,
      limit: 10,
      numberOf30MinsInterval: "1",
    }),
    enabled: vaultContractId !== null,
  });

  const allocationDonutDetails = useMemo(() => {
    const filteredList = (balanceDistributionQuery.data || []).filter((v) => {
      if (Number(v.amount) <= 0) {
        return false;
      }
      return true;
    });
    const totalDistributionInBig = filteredList.reduce((prev, cur) => {
      return prev.add(Big(cur.amount));
    }, Big(0));
    const donutFigures = filteredList
      .map((v) => {
        return {
          name: v.assetSymbol,
          value: Big(v.amount)
            .div(totalDistributionInBig)
            .mul(Big(100))
            .toNumber(),
        };
      })
      .filter((e) => e.value !== 0);

    return {
      donutFigures,
      totalDistribution: totalDistributionInBig.toFixed(),
    };
  }, [balanceDistributionQuery.data]);

  const sharePriceDetails = useMemo(() => {
    let latestSharePrice = "0";
    if (
      historicalSharePriceQuery.data &&
      historicalSharePriceQuery.data.length > 0
    ) {
      latestSharePrice = historicalSharePriceQuery.data[0].price_in_base_asset;
    }
    const chart = (historicalSharePriceQuery.data || []).map((v) => {
      return {
        date: new Date(v.bucket).toLocaleString(),
        value: Number(v.price_in_base_asset),
      };
    }).reverse()

    return {
      latestSharePrice,
      chart,
    };
  }, [historicalSharePriceQuery.data]);

  const balanceDetails = useMemo(() => {
    let latestCurrentTotal = "0";
    if (historicalBalanceQuery.data && historicalBalanceQuery.data.length > 0) {
      latestCurrentTotal = historicalBalanceQuery.data[0].balance_in_base_asset;
    }
    const chart = (historicalBalanceQuery.data || [])
      .map((v) => {
        return {
          date: new Date(v.bucket).toLocaleString(),
          value: Number(v.balance_in_base_asset),
        };
      })
      .reverse();

    return {
      latestCurrentTotal,
      chart,
    };
  }, [historicalBalanceQuery.data]);

  const { assetIcon, assetSymbol } = assetUtils.useAssetSymbolAndIcon({
    asset: baseAssetQuery.data || null,
  });

  const managementFee = vaultConfigQuery.data?.management_fee_bps
    ? vaultConfigQuery.data?.management_fee_bps / 100
    : 0;
  const performanceFee = vaultConfigQuery.data?.performance_fee_bps
    ? vaultConfigQuery.data?.performance_fee_bps / 100
    : 0;
  const totalFee = (managementFee + performanceFee).toFixed(3);

  const roleData = allRoleAssignmentsQuery.data ?? [];

  const totalPolicy = policyCountQuery.data ?? 0;

  const policies = allPoliciesQuery.data?.pages.flat() ?? [];

  return (
    <div className="w-full h-full md:w-2/3 ">
      <Motion direction="right" duration={0.6} delay={0.9}>
        <div className="w-full h-full bg-[linear-gradient(139deg,#000000,#0C0C0C)] rounded-2xl shadow-lg space-y-6 border border-dark-border-color min-h-[90vh] mb-[100px]">
          {/* Tabs */}
          <div className="p-6 pb-1 sticky top-0 z-9  bg-black/10 backdrop-blur-sm  rounded-2xl ">
            <div className="flex bg-tab-background rounded-sm mb-6 overflow-hidden ">
              {["overview", "vault settings", "all activities"].map((t) => {
                const isRightActive = rightTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setRightTab(t)}
                    className={`relative w-1/2 py-2.5 text-base capitalize font-medium  duration-300 hover:opacity-50 transition`}
                  >
                    {isRightActive && (
                      <motion.div
                        layoutId="rightActiveTab"
                        className="absolute inset-0 bg-tab-button-background rounded-sm"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                    <span
                      className={`relative z-10 ${
                        isRightActive ? "text-black font-bold" : "text-gray"
                      }`}
                    >
                      {t}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabs Content */}
          <div className="p-6 pt-0">
            {/* Animate between Overview , Vault and All activity */}
            <AnimatePresence mode="wait">
              {rightTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {/* Overview Content  */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-base text-white mb-2">Description</p>
                      <p className="text-sm text-gray">
                        This vault provides leveraged exposure to yoUSD, earning
                        outstanding dollar denominated yield and a diverse
                        amount of points. yoUSD tracks the best risk-adjusted
                        yield across chains and continuously reallocates your
                        assets across chains and protocols to maximize yield.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-base text-white mb-2">
                          Benchmark Assets
                        </p>
                        <div className="flex gap-1.5 items-center ">
                          <img
                            src={assetIcon}
                            alt={assetSymbol}
                            className="w-6 h-6"
                          />{" "}
                          <p className="text-base text-gray">{assetSymbol}</p>
                        </div>
                      </div>
                      {/* <div>
                        <p className="text-base text-white mb-2">Rewards</p>
                        <div className="flex gap-1.5 items-center ">
                          <img src={Near} alt={"NEAR"} className="w-6 h-6" />
                          <img
                            src={Dai}
                            alt={"Dai"}
                            className="w-6 h-6 ml-[-10px]"
                          />
                          <img
                            src={Arb}
                            alt={"Arb"}
                            className="w-6 h-6 ml-[-10px]"
                          />
                          <img
                            src={Btc}
                            alt={"Btc"}
                            className="w-6 h-6 ml-[-10px]"
                          />
                        </div>
                      </div> */}
                    </div>

                    <hr className="border-t border-border-color mt-9 mb-9" />

                    {/* TVL Graph  */}
                    <p className="text-base text-white mb-4">
                      Total Value Locked Overview
                    </p>
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      <div className=" p-4 rounded-lg">
                        <div className="">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex gap-3 items-center">
                              <img
                                src={assetIcon}
                                alt={assetSymbol}
                                className="w-12 h-12"
                              />
                              <div>
                                <h3 className="text-3xl font-semibold">
                                  {stringUtils.truncateDecimals(
                                    balanceDetails.latestCurrentTotal
                                  )}{" "}
                                  {assetSymbol}{" "}
                                </h3>
                                {/* <p className="text-sm text-gray">$51,737,237</p> */}
                              </div>
                            </div>
                            {/* <div className="flex gap-2 text-xs">
                              {["1D", "1W", "1M", "1Y"].map((range) => (
                                <button
                                  key={range}
                                  className="px-2 py-1 rounded hover:bg-gray-700"
                                >
                                  {range}
                                </button>
                              ))}
                              <button
                                key={"ALL"}
                                className="px-2 py-1 bg-gray rounded hover:bg-gray-700"
                              >
                                {"ALL"}
                              </button>
                            </div> */}
                          </div>
                          <div className="h-[400px] ml-[-6%] w-[108%]  to-transparent rounded">
                            <DewChart data={balanceDetails.chart} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-t border-border-color mt-9 mb-9" />

                    {/* Allocation Graph  */}
                    <p className="text-base text-white mb-4">
                      Allocation Overview
                    </p>
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      <div className=" p-4 rounded-lg">
                        <div className="">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex gap-3 items-center">
                              <img
                                src={assetIcon}
                                alt={assetSymbol}
                                className="w-12 h-12"
                              />
                              <div>
                                <h3 className="text-3xl font-semibold">
                                  {stringUtils.truncateDecimals(
                                    allocationDonutDetails.totalDistribution
                                  )}{" "}
                                  {assetSymbol}{" "}
                                </h3>
                                {/* <p className="text-sm text-gray">$51,737,237</p> */}
                              </div>
                            </div>
                            {/* <div className="flex gap-2 text-xs">
                              {["1D", "1W", "1M", "1Y"].map((range) => (
                                <button
                                  key={range}
                                  className="px-2 py-1 rounded hover:bg-gray-700"
                                >
                                  {range}
                                </button>
                              ))}
                              <button
                                key={"ALL"}
                                className="px-2 py-1 bg-gray rounded hover:bg-gray-700"
                              >
                                {"ALL"}
                              </button>
                            </div> */}
                          </div>
                          {allocationDonutDetails.totalDistribution !== "0" && (
                            <div className="h-[400px] ml-[-6%] w-[108%]  to-transparent rounded">
                              <AllocationDonut
                                data={allocationDonutDetails.donutFigures}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <hr className="border-t border-border-color mt-9 mb-9" />

                    {/* APY History Graph  */}
                    <p className="text-base text-white mb-4">
                      Share Price History Overview
                    </p>
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      <div className=" p-4 rounded-lg">
                        <div className="">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex gap-3 items-center">
                              <img
                                src={assetIcon}
                                alt={assetSymbol}
                                className="w-12 h-12"
                              />
                              <div>
                                <h3 className="text-3xl font-semibold">
                                  {sharePriceDetails.latestSharePrice}{" "}
                                  {assetSymbol}{" "}
                                </h3>
                                {/* <p className="text-sm text-gray">$51,737,237</p> */}
                              </div>
                            </div>
                            {/* <div className="flex gap-2 text-xs">
                              {["1D", "1W", "1M", "1Y"].map((range) => (
                                <button
                                  key={range}
                                  className="px-2 py-1 rounded hover:bg-gray-700"
                                >
                                  {range}
                                </button>
                              ))}
                              <button
                                key={"ALL"}
                                className="px-2 py-1 bg-gray rounded hover:bg-gray-700"
                              >
                                {"ALL"}
                              </button>
                            </div> */}
                          </div>
                          <div className="h-[400px] ml-[-6%] w-[108%]  to-transparent rounded">
                            <DewChart2 data={sharePriceDetails.chart} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {rightTab === "vault settings" && (
                <motion.div
                  key="vault settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    {/* Vault Fees Content  */}
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-base text-white ">Vault Fee</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 mt-3">
                      <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-5 py-7 rounded-md border border-dark-border-color flex justify-between">
                        <div>
                          <p className="text-sm text-gray">Management fee</p>
                          <p className="text-2xl font-semibold">
                            {managementFee}%
                          </p>
                        </div>
                        <img src={FeeIcon1} className="  h-[60px]" />
                      </div>

                      <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-4 py-7 rounded-md border border-dark-border-color flex justify-between">
                        <div>
                          <p className="text-sm text-gray">Performance fee</p>
                          <p className="text-2xl font-semibold">
                            {performanceFee}%
                          </p>
                        </div>
                        <img src={FeeIcon2} className="  h-[60px]" />
                      </div>

                      {/* <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-4 py-7 rounded-md border border-dark-border-color flex justify-between">
                        <div>
                          <p className="text-sm text-gray">Entry/Exit Fee</p>
                          <p className="text-2xl font-semibold">0.8%</p>
                        </div>
                        <img src={FeeIcon3} className="  h-[60px]" />
                      </div>

                      <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-4 py-7 rounded-md border border-dark-border-color flex justify-between">
                        <div>
                          <p className="text-sm text-gray">
                            Protocol revenue share
                          </p>
                          <p className="text-2xl font-semibold">0.1%</p>
                        </div>
                        <img src={FeeIcon4} className="  h-[60px]" />
                      </div> */}
                    </div>

                    <hr className="border-t border-border-color mt-9 mb-9" />

                    {/* Roles Content  */}
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-base text-white ">Roles</p>
                      <p className="text-sm text-gray">
                        Total {roleData.length}{" "}
                        {roleData.length > 1 ? "Roles" : "Role"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {roleData.map((role, i) => {
                        const isFirst = i === 0;
                        const isLast = i === roleData.length - 1;

                        return (
                          <div
                            key={i}
                            className={`flex justify-between p-4 border border-dark-border-color
                                                    bg-[#0b0b0d]  mb-0
                                                    ${
                                                      isFirst
                                                        ? "rounded-t-md"
                                                        : ""
                                                    } ${
                              isLast ? "rounded-b-md border-b-0" : ""
                            }`}
                          >
                            <div>
                              <p
                                className="text-sm font-medium"
                                style={{ textTransform: "capitalize" }}
                              >
                                {role.role}
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              {role.addresses.map((addr, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-end space-x-2 cursor-pointer p-1 px-2 transition-colors duration-200 ${
                                    hoverAddress === addr
                                      ? "bg-input-focus rounded "
                                      : ""
                                  }`}
                                  onMouseEnter={() => setHoverAddress(addr)}
                                  onMouseLeave={() => setHoverAddress(null)}
                                >
                                  <a
                                    href={`https://etherscan.io/address/${addr}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-gray truncate max-w-[250px] underline"
                                  >
                                    {addr}
                                  </a>
                                  <Copy
                                    className="cursor-pointer"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        "0xa1...near"
                                      );
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

                    {/* Policy Content  */}
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-base text-white ">Policy</p>
                      <p className="text-sm text-gray">
                        Total {totalPolicy} Policies
                      </p>
                    </div>
                    {policies.map((policy, idx) => (
                      <Link to="/policy">
                        <div
                          key={idx}
                          className="bg-[#0b0b0d] p-4 py-5 rounded-md border border-dark-border-color mb-3 flex justify-between items-center cursor-pointer transition-all duration-200 hover:bg-input-background"
                        >
                          <div>
                            <p className="text-base font-semibold">
                              {policy.id}
                            </p>
                            <p className="text-sm  text-gray">
                              {policy.description}
                            </p>
                          </div>
                          <span
                            className={clsx(
                              "px-2 py-1 text-xs font-semibold rounded-full",
                              policy.policy_status === "Active"
                                ? "text-green-800 bg-green-200"
                                : "text-red-800 bg-red-200"
                            )}
                          >
                            {policy.policy_status}
                          </span>
                        </div>
                      </Link>
                    ))}
                    <Link to="/policy">
                      <div className="flex justify-end items-center gap-2 mt-4 group">
                        <button className="text-sm text-primary group-hover:opacity-70">
                          View All Policies
                        </button>
                        <ArrowRight
                          className="text-primary transform transition-transform duration-300  group-hover:opacity-70 group-hover:translate-x-1"
                          size={16}
                        />
                      </div>
                    </Link>
                  </div>
                </motion.div>
              )}
              {rightTab === "all activities" && (
                <motion.div
                  key="all activities"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      {/* All Activity - Coming soon */}
                      <div className="blur-sm">
                        <TransactionTable />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray text-xl font-semibold">
                          Coming Soon
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Motion>
    </div>
  );
});

export default RightPanel;
