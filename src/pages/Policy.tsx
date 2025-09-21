import { ArrowLeft, Eye, Search, X } from "lucide-react";
import vaultIcon from "../assets/vault-icon.png";
import Near from "../assets/near.png";
import { useState } from "react";
import Modal from "react-modal";
import Dew2 from "../assets/dew2.svg";
import Dew3 from "../assets/dew3.svg";
import { Link, useSearchParams } from "react-router-dom";
import Motion from "../components/utils/Motion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { vaultQueries, type TPolicy } from "../queries/vault";
import InfiniteScroll from "react-infinite-scroll-component";
import { vaultUtils } from "../utils/vaultUtils";
import { assetUtils } from "../utils/assetUtils";

export default function Policy() {
  const [searchParams] = useSearchParams({
    vaultContractId: vaultUtils.DEFAULT_VAULT_CONTRACT_ID,
  });

  const vaultContractId = searchParams.get("vaultContractId");

  const [selectedPolicy, setSelectedPolicy] = useState<TPolicy | null>(null);

  const baseAssetQuery = useQuery({
    ...vaultQueries.getVaultBaseAssetQueryOptions({
      vaultContractId: vaultContractId!,
    }),
    enabled: vaultContractId !== null,
  });

   const { assetIcon } = assetUtils.useAssetSymbolAndIcon({
    asset: baseAssetQuery.data || null,
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
    }),
    enabled: vaultContractId !== null,
  });

  const totalPolicy = policyCountQuery.data ?? 0;

  const policies = allPoliciesQuery.data?.pages.flat() ?? [];

  return (
    <div className="min-h-screen mt-[40px]">
      <img
        src={Dew2}
        className="absolute top-[30vh] left-[-80px] w-[10px] dew-float"
      />
      <img
        src={Dew3}
        className="absolute top-[95vh] right-[-50px] w-[20px] dew-float2"
      />

      {/* Back */}
      <Motion direction="left" duration={0.6}>
        <Link to="/" className="w-fit flex">
          <div className="flex gap-3 transition-opacity hover:opacity-50 items-center cursor-pointer w-fit">
            <div className="flex justify-center items-center bg-[#161616] w-8 h-8 rounded-full">
              <ArrowLeft size={16} className="text-gray" />
            </div>
            <span className="text-gray text-sm">Go Back</span>
          </div>
        </Link>
      </Motion>

      {/* Heading */}
      <div className="mt-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <Motion direction="left" duration={0.6} delay={0.3}>
          <div className="flex items-center gap-6 py-6">
            <div className="w-[55px] h-[55px] relative">
              <img src={vaultIcon} className="w-[55px] h-[55px]" />
              <img
                src={assetIcon}
                className="absolute bottom-[-5px] right-[-10px] w-[30px] h-[30px]"
              />
            </div>
            <div>
              <h2 className="font-semibold text-2xl">Vault Name Policy</h2>
              <p className="text-sm text-gray font-light">
                Total {totalPolicy} Policies
              </p>
            </div>
          </div>
        </Motion>
        <Motion direction="right" duration={0.6} delay={0.6}>
          <label className="group flex items-center w-full md:w-[250px] rounded-lg px-3 py-2 bg-input-background shadow-xs cursor-text border border-input-border transition-all duration-300 focus-within:ring-2 focus-within:ring-[#28282F] focus-within:border-[#28282F]">
            <Search size={16} className="text-gray mr-2" />
            <input
              type="text"
              placeholder="Search  ..."
              className="w-full text-sm outline-hidden bg-transparent text-white placeholder-gray"
            />
          </label>
        </Motion>
      </div>

      {/* Policy List */}
      <Motion direction="up" duration={0.6} delay={0.9}>
        <InfiniteScroll
          dataLength={policies.length}
          next={allPoliciesQuery.fetchNextPage}
          hasMore={policies.length < totalPolicy}
          loader={<h4 className="text-center text-gray">Loading...</h4>}
          className="space-y-4 mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20"
        >
          {policies.map((policy, i) => {
            return (
              <div
                key={i}
                className={`bg-[linear-gradient(139deg,#000000,#181822)] p-5 ${
                  !vaultUtils.isChainSigTransaction(policy)
                    ? "pb-[20px]"
                    : "pb-[70px]"
                } rounded-md relative border border-dark-border-color w-full h-full mx-auto`}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white mb-0">
                    {policy.id}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full  ${
                      policy.policy_status === "Active"
                        ? "text-green-800 bg-green-200"
                        : "text-red-800 bg-red-200"
                    }`}
                  >
                    {policy.policy_status}
                  </span>
                </div>
                <p className="text-sm text-gray mb-2">{policy.description}</p>
                <hr className="border-t border-border-color mt-5 mb-5" />
                <div className="text-sm flex gap-2 flex-col">
                  <div className="flex justify-between items-center w-full">
                    <p className="text-gray font-sm">Required Role</p>
                    <p className="text-right">{policy.required_role}</p>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <p className="text-gray font-sm">Votes Required</p>
                    <p className="text-right">{policy.required_vote_count}</p>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <p className="text-gray font-sm">Type</p>
                    <p className="text-right">{policy.policy_type}</p>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <p className="text-gray font-sm">Activation Time</p>
                    <p className="text-right">{policy.activation_time}</p>
                  </div>

                  {vaultUtils.isChainSigTransaction(policy) && (
                    <>
                      <div className="flex justify-between items-center w-full">
                        <p className="text-gray font-sm">Chain</p>
                        <p className="text-right">
                          {
                            policy.policy_details.ChainSigTransaction
                              .chain_environment
                          }
                        </p>
                      </div>

                      <div className="flex justify-between items-center w-full">
                        <p className="text-gray font-sm">Derivation Path</p>
                        <p className="text-right">
                          {
                            policy.policy_details.ChainSigTransaction
                              .derivation_path
                          }
                        </p>
                      </div>

                      <div className="flex justify-between items-center w-full">
                        <p className="text-gray font-sm">No. of Restrictions</p>
                        <p className="text-right">
                          {policy.policy_details.ChainSigTransaction
                            .restrictions?.length ?? 0}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {vaultUtils.isChainSigTransaction(policy) && (
                  <div className="absolute bottom-0 left-0 w-full">
                    <button
                      onClick={() => setSelectedPolicy(policy)}
                      className="text-sm font-medium w-full h-full flex justify-center items-center p-4 bg-[#181822] border-t border-dark-border-color hover:opacity-50 transition-opacity duration-200"
                    >
                      View Restrictions <Eye size={16} className="ml-2" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </InfiniteScroll>
      </Motion>

      {/* Policy Details Modal */}
      <Modal
        isOpen={!!selectedPolicy}
        onRequestClose={() => setSelectedPolicy(null)}
        shouldCloseOnOverlayClick
        className={`
                    w-full max-w-[500px] mx-auto
                    bg-[linear-gradient(139deg,#000000,#0C0C0C)] p-5
                    rounded-xl
                    transition-all duration-300
                    animate-drawer-slide-up  md:border md:border-modal-border
                    pb-8
                `}
        overlayClassName={`
                    fixed inset-0 z-20 bg-black/40 backdrop-blur-md
                    flex items-end md:items-center justify-center
                `}
      >
        <button
          onClick={() => setSelectedPolicy(null)}
          className="modal-close-btn absolute bg-card-secondary-color top-[0px] right-[15px] md:-top-[30px] md:-right-[15px] w-[30px] h-[30px] md:w-[40px] md:h-[40px] flex justify-center items-center transition-all duration-300 rounded-full mt-4 text-xs underline"
        >
          <X size={24} className="text-gray" />
        </button>

        {selectedPolicy &&
          selectedPolicy.policy_type === "ChainSigTransaction" &&
          selectedPolicy.policy_details.ChainSigTransaction.restrictions && (
            <div className="relative ">
              <div className="space-y-2 mt-4">
                <h2 className="text-lg font-semibold text-white mb-0">
                  Restrictions List for {selectedPolicy.id}
                </h2>
                <p className="mb-4 text-gray text-sm">
                  {" "}
                  Total{" "}
                  {
                    selectedPolicy.policy_details.ChainSigTransaction
                      .restrictions.length
                  }{" "}
                  restrictions
                </p>
                <div className=" max-h-[70vh] overflow-y-auto space-y-4 pb-4">
                  {selectedPolicy.policy_details.ChainSigTransaction.restrictions.map(
                    (restriction, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#131319] rounded-md text-sm flex flex-col gap-4"
                      >
                        <div className="flex justify-between items-center">
                          <p className=" text-gray">Method</p>
                          <p>{restriction.method}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className=" text-gray">Contract</p>
                          <p>{restriction.contract_id}</p>
                        </div>
                        <div className="flex justify-between gap-x-10">
                          <p className="text-gray">Interface</p>
                          <p>
                            {vaultUtils.decodeInterface(restriction.interface)}
                          </p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-gray">Schema</p>
                          <div className="text-right">
                            {restriction.schema.map((s, idx) => (
                              <div key={idx} className="mb-2">
                                {s.path} - {s.type}{" "}
                                {s.lte ? `(max: ${s.lte})` : ""}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
      </Modal>
    </div>
  );
}
