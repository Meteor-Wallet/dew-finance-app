import { memo, useEffect, useState } from "react";
import Arb from "../../assets/arb.png";
import Btc from "../../assets/btc.png";
import Dai from "../../assets/dai-full.svg";
import Near from "../../assets/near.png";
import Motion from "../../components/utils/Motion";
import FeeIcon1 from "../../assets/fee_icon1.svg";
import FeeIcon2 from "../../assets/fee_icon2.svg";
import FeeIcon3 from "../../assets/fee_icon3.svg";
import FeeIcon4 from "../../assets/fee_icon4.svg";
import { motion, AnimatePresence } from "framer-motion";
import DewChart from "../../components/sample/DewChart";
import AllocationDonut from "../../components/sample/AllocationDonut";
import DewChart2 from "../../components/sample/DewChart2";
import { ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import TransactionTable from "../../components/sample/TransactionTable";
import { useQuery } from "@tanstack/react-query";
import { vaultQueries } from "../../queries/vault";

// const roles = [
//   {
//     title: "Access Manager",
//     addresses: ["0xbF28EFa4CBD9bE1A5447BC69f6a451C7F7EAa8a5"],
//   },
//   {
//     title: "Withdraw Manager",
//     addresses: ["0x12C34EfA4CBD9bE1A5447BC69f6a451C7F7EAa123"],
//   },
//   {
//     title: "Price Oracle",
//     addresses: ["0xAB28EFa4CBD9bE1A5447BC69f6a451C7F7EAa456"],
//   },
//   {
//     title: "Owner",
//     addresses: ["0x40e609De1B52511B0B1aCccDB0B565803b0605E3"],
//   },
//   {
//     title: "Atomist",
//     addresses: [
//       "0xbF28EFa4CBD9bE1A5447BC69f6a451C7F7EAa8a5",
//       "0x40e609De1B52511B0B1aCccDB0B565803b0605E3",
//     ],
//   },
//   {
//     title: "Alpha",
//     addresses: ["0x9A28EFa4CBD9bE1A5447BC69f6a451C7F7EAa789"],
//   },
// ];

const RightPanel = memo(() => {
  const [searchParams] = useSearchParams({
    vaultContractId: "stable-test-1.dew-finance.near",
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

  const accountsWithRoleQuery = useQuery({
    ...vaultQueries.getAccountsWithRoleQueryOptions({
      vaultContractId: vaultContractId!,
      roleName: "owner"!,
    }),
    enabled: vaultContractId !== null,
  });

  const managementFee = vaultConfigQuery.data?.management_fee_bps
    ? `${vaultConfigQuery.data?.management_fee_bps / 10000}%`
    : "-";
  const performanceFee = vaultConfigQuery.data?.performance_fee_bps
    ? `${vaultConfigQuery.data?.performance_fee_bps / 10000}%`
    : "-";

  const roles = [
    {
      title: "Owner",
      addresses: accountsWithRoleQuery.data ?? [],
    },
  ];

  const allAssetDepositFeesQuery = useQuery({
    ...vaultQueries.getAllAssetDepositFeesQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });
  const protocolAllAssetDepositCutQuery = useQuery({
    ...vaultQueries.getProtocolAllAssetDepositCutQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });
  const allAssetWithdrawalFeesQuery = useQuery({
    ...vaultQueries.getAllAssetWithdrawalFeesQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });
  const protocolAllAssetWithdrawalCutQuery = useQuery({
    ...vaultQueries.getProtocolAllAssetWithdrawalCutQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

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
                          <img src={Near} alt={"NEAR"} className="w-6 h-6" />{" "}
                          <p className="text-base text-gray">NEAR </p>
                        </div>
                      </div>
                      <div>
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
                      </div>
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
                                src={Near}
                                alt={"NEAR"}
                                className="w-12 h-12"
                              />
                              <div>
                                <h3 className="text-3xl font-semibold">
                                  11,714.13 near{" "}
                                </h3>
                                <p className="text-sm text-gray">$51,737,237</p>
                              </div>
                            </div>
                            <div className="flex gap-2 text-xs">
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
                            </div>
                          </div>
                          <div className="h-[400px] ml-[-6%] w-[108%]  to-transparent rounded">
                            <DewChart />
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
                                src={Near}
                                alt={"NEAR"}
                                className="w-12 h-12"
                              />
                              <div>
                                <h3 className="text-3xl font-semibold">
                                  11,714.13 near{" "}
                                </h3>
                                <p className="text-sm text-gray">$51,737,237</p>
                              </div>
                            </div>
                            <div className="flex gap-2 text-xs">
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
                            </div>
                          </div>
                          <div className="h-[400px] ml-[-6%] w-[108%]  to-transparent rounded">
                            <AllocationDonut />
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-t border-border-color mt-9 mb-9" />

                    {/* APY History Graph  */}
                    <p className="text-base text-white mb-4">
                      APY History Overview
                    </p>
                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                      <div className=" p-4 rounded-lg">
                        <div className="">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex gap-3 items-center">
                              <img
                                src={Near}
                                alt={"NEAR"}
                                className="w-12 h-12"
                              />
                              <div>
                                <h3 className="text-3xl font-semibold">
                                  11,714.13 near{" "}
                                </h3>
                                <p className="text-sm text-gray">$51,737,237</p>
                              </div>
                            </div>
                            <div className="flex gap-2 text-xs">
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
                            </div>
                          </div>
                          <div className="h-[400px] ml-[-6%] w-[108%]  to-transparent rounded">
                            <DewChart2 />
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
                      <p className="text-sm text-gray">Total Fee : 1.05%</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 mt-3">
                      <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-5 py-7 rounded-md border border-dark-border-color flex justify-between">
                        <div>
                          <p className="text-sm text-gray">Management fee</p>
                          <p className="text-2xl font-semibold">
                            {managementFee}
                          </p>
                        </div>
                        <img src={FeeIcon1} className="  h-[60px]" />
                      </div>

                      <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-4 py-7 rounded-md border border-dark-border-color flex justify-between">
                        <div>
                          <p className="text-sm text-gray">Performance fee</p>
                          <p className="text-2xl font-semibold">
                            {performanceFee}
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
                        Total {roles.length}{" "}
                        {roles.length > 1 ? "Roles" : "Role"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {roles.map((role, i) => {
                        const isFirst = i === 0;
                        const isLast = i === roles.length - 1;
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
                              <p className="text-sm font-medium">
                                {role.title}
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
                      <p className="text-sm text-gray">Total 381 Policies</p>
                    </div>
                    <Link to="/policy">
                      <div className="bg-[#0b0b0d] p-4 py-5 rounded-md border border-dark-border-color mb-3 flex justify-between items-center cursor-pointer transition-all duration-200 hover:bg-input-background">
                        <div>
                          <p className="text-base font-semibold">
                            transfer_sepolia_usdc
                          </p>
                          <p className="text-sm  text-gray">
                            Policy for transferring usdc
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
                          Active
                        </span>
                      </div>
                    </Link>
                    <Link to="/policy">
                      <div className="bg-[#0b0b0d] p-4 py-5 rounded-md border border-dark-border-color mb-3 flex justify-between items-center cursor-pointer transition-all duration-200 hover:bg-input-background">
                        <div>
                          <p className="text-base font-semibold">
                            transfer_sepolia_usdc
                          </p>
                          <p className="text-sm  text-gray">
                            Policy for transferring usdc
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
                          Active
                        </span>
                      </div>
                    </Link>
                    <Link to="/policy">
                      <div className="bg-[#0b0b0d] p-4 py-5 rounded-md border border-dark-border-color mb-3 flex justify-between items-center cursor-pointer transition-all duration-200 hover:bg-input-background">
                        <div>
                          <p className="text-base font-semibold">
                            transfer_sepolia_usdc
                          </p>
                          <p className="text-sm  text-gray">
                            Policy for transferring usdc
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
                          Active
                        </span>
                      </div>
                    </Link>
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
