import { ArrowLeft, Eye, Search, X } from "lucide-react";
import vaultIcon from "../assets/vault-icon.png";
import Near from "../assets/near.png";
import { useState } from "react";
import Modal from "react-modal";
import { Link } from "react-router-dom";

export default function Policy() {

    const policies = [
        {
            id: "transfer_sepolia_usdc",
            description: "Policy for transferring USDC",
            required_role: "owner",
            required_vote_count: 1,
            policy_status: "Active",
            policy_type: "ChainSigTransaction",
            activation_time: "0",
            policy_details: {
                ChainSigTransaction: {
                    derivation_path: "1",
                    chain_name: "ETH",
                    restrictions: [
                        {
                            method: "transfer",
                            contract_id: "0xSepoliaUSDCAddress",
                            schema: [
                                { path: "$.to", type: "String" },
                                { path: "$.value", type: "BigInt", lte: "1000000000" },
                            ],
                            interface: "Base64ERC20ABI",
                        },
                        {
                            method: "transfer",
                            contract_id: "0xSepoliaUSDCAddress",
                            schema: [
                                { path: "$.to", type: "String" },
                                { path: "$.value", type: "BigInt", lte: "1000000000" },
                            ],
                            interface: "Base64ERC20ABI",
                        },
                        {
                            method: "transfer",
                            contract_id: "0xSepoliaUSDCAddress",
                            schema: [
                                { path: "$.to", type: "String" },
                                { path: "$.value", type: "BigInt", lte: "1000000000" },
                            ],
                            interface: "Base64ERC20ABI",
                        },
                        {
                            method: "transfer",
                            contract_id: "0xSepoliaUSDCAddress",
                            schema: [
                                { path: "$.to", type: "String" },
                                { path: "$.value", type: "BigInt", lte: "1000000000" },
                            ],
                            interface: "Base64ERC20ABI",
                        },
                    ],
                },
            },
        },
        {
            id: "transfer_sepolia_dai",
            description: "Policy for transferring DAI",
            required_role: "owner",
            required_vote_count: 2,
            policy_status: "Inactive",
            policy_type: "ChainSigTransaction",
            activation_time: "0",
            policy_details: {
                ChainSigTransaction: {
                    derivation_path: "2",
                    chain_name: "ETH",
                    restrictions: [
                        {
                            method: "transfer",
                            contract_id: "0xSepoliaDAIAddress",
                            schema: [
                                { path: "$.to", type: "String" },
                                { path: "$.value", type: "BigInt", lte: "500000000" },
                            ],
                            interface: "Base64ERC20ABI",
                        },
                    ],
                },
            },
        },
        {
            id: "transfer_sepolia_usdc",
            description: "Policy for transferring USDC",
            required_role: "owner",
            required_vote_count: 1,
            policy_status: "Active",
            policy_type: "ChainSigTransaction",
            activation_time: "0",
            policy_details: {
                ChainSigTransaction: {
                    derivation_path: "1",
                    chain_name: "ETH",
                    restrictions: [
                        {
                            method: "transfer",
                            contract_id: "0xSepoliaUSDCAddress",
                            schema: [
                                { path: "$.to", type: "String" },
                                { path: "$.value", type: "BigInt", lte: "1000000000" },
                            ],
                            interface: "Base64ERC20ABI",
                        },
                    ],
                },
            },
        },
        {
            id: "transfer_sepolia_dai",
            description: "Policy for transferring DAI",
            required_role: "owner",
            required_vote_count: 2,
            policy_status: "Inactive",
            policy_type: "ChainSigTransaction",
            activation_time: "0",
            policy_details: {
                ChainSigTransaction: {
                    derivation_path: "2",
                    chain_name: "ETH",
                    restrictions: [
                        {
                            method: "transfer",
                            contract_id: "0xSepoliaDAIAddress",
                            schema: [
                                { path: "$.to", type: "String" },
                                { path: "$.value", type: "BigInt", lte: "500000000" },
                            ],
                            interface: "Base64ERC20ABI",
                        },
                    ],
                },
            },
        },
        {
            id: "transfer_sepolia_usdc",
            description: "Policy for transferring USDC",
            required_role: "owner",
            required_vote_count: 1,
            policy_status: "Active",
            policy_type: "ChainSigTransaction",
            activation_time: "0",
            policy_details: {
                ChainSigTransaction: {
                    derivation_path: "1",
                    chain_name: "ETH",
                    restrictions: [
                        {
                            method: "transfer",
                            contract_id: "0xSepoliaUSDCAddress",
                            schema: [
                                { path: "$.to", type: "String" },
                                { path: "$.value", type: "BigInt", lte: "1000000000" },
                            ],
                            interface: "Base64ERC20ABI",
                        },
                    ],
                },
            },
        },
        {
            id: "transfer_sepolia_dai",
            description: "Policy for transferring DAI",
            required_role: "owner",
            required_vote_count: 2,
            policy_status: "Inactive",
            policy_type: "ChainSigTransaction",
            activation_time: "0",
            policy_details: {
                ChainSigTransaction: {
                    derivation_path: "2",
                    chain_name: "ETH",
                    restrictions: [
                        {
                            method: "transfer",
                            contract_id: "0xSepoliaDAIAddress",
                            schema: [
                                { path: "$.to", type: "String" },
                                { path: "$.value", type: "BigInt", lte: "500000000" },
                            ],
                            interface: "Base64ERC20ABI",
                        },
                    ],
                },
            },
        }
    ];
    const [selectedPolicy, setSelectedPolicy] = useState<any>(null);

    return (
        <div className="min-h-screen mt-[40px]">

            {/* Back */}
            <Link to="/">
                <div className='flex gap-3 transition-opacity hover:opacity-50 items-center cursor-pointer w-fit' >
                    <div className="flex justify-center items-center bg-[#161616] w-8 h-8 rounded-full">
                        <ArrowLeft size={16} className="text-gray" />
                    </div>
                    <span className='text-gray text-sm' >
                        Go Back
                    </span>
                </div>
            </Link>

            {/* Heading */}
            <div className="mt-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center gap-6 py-6">
                    <div className="w-[55px] h-[55px] relative">
                        <img src={vaultIcon} className='w-[55px] h-[55px]' />
                        <img src={Near} className="absolute bottom-[-5px] right-[-10px] w-[30px] h-[30px]" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-2xl">Vault Name Policy</h2>
                        <p className="text-sm text-gray font-light">Total 381 Policies</p>
                    </div>
                </div>
                <label className="group flex items-center w-full md:w-[250px] rounded-lg px-3 py-2 bg-input-background shadow-xs cursor-text border border-input-border transition-all duration-300 focus-within:ring-2 focus-within:ring-[#28282F] focus-within:border-[#28282F]">
                    <Search size={16} className="text-gray mr-2" />
                    <input
                        type="text"
                        placeholder="Search  ..."
                        className="w-full text-sm outline-hidden bg-transparent text-white placeholder-gray"
                    />
                </label>
            </div>

            {/* Policy List */}
            <div className="space-y-4 mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
                {policies.map((policy, i) => {
                    return (
                        <div
                            key={i}
                            className="bg-[linear-gradient(139deg,#000000,#181822)] p-5 pb-[80px] rounded-md relative border border-dark-border-color w-full h-full mx-auto"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-white mb-0">{policy.id}</h3>
                                <span
                                    className={`px-2 py-1 text-xs font-semibold rounded-full  ${policy.policy_status === "Active"
                                        ? "text-green-800 bg-green-200"
                                        : "text-red-800 bg-red-200"
                                        }`}
                                >
                                    {policy.policy_status}
                                </span>
                            </div>
                            <p className="text-sm text-gray mb-2">{policy.description}</p>
                            <hr className='border-t border-border-color mt-5 mb-5' />
                            <div className="text-sm flex gap-2 flex-col">
                                <div className='flex justify-between items-center w-full'>
                                    <p className='text-gray font-sm'>Required Role</p>
                                    <p className='text-right'>{policy.required_role}</p>
                                </div>
                                <div className='flex justify-between items-center w-full'>
                                    <p className='text-gray font-sm'>Votes Required</p>
                                    <p className='text-right'>{policy.required_vote_count}</p>
                                </div>
                                <div className='flex justify-between items-center w-full'>
                                    <p className='text-gray font-sm'>Type</p>
                                    <p className='text-right'>{policy.policy_type}</p>
                                </div>
                                <div className='flex justify-between items-center w-full'>
                                    <p className='text-gray font-sm'>Activation Time</p>
                                    <p className='text-right'>{policy.activation_time}</p>
                                </div>
                                <div className='flex justify-between items-center w-full'>
                                    <p className='text-gray font-sm'>Chain</p>
                                    <p className='text-right'>{policy.policy_details.ChainSigTransaction.chain_name}</p>
                                </div>
                                <div className='flex justify-between items-center w-full'>
                                    <p className='text-gray font-sm'>Derivation Path</p>
                                    <p className='text-right'>{policy.policy_details.ChainSigTransaction.derivation_path}</p>
                                </div>
                            </div>
                            <div className='absolute bottom-0 left-0 w-full  '>
                                <button
                                    onClick={() => setSelectedPolicy(policy)}
                                    className="text-sm font-medium w-full h-full flex justify-center items-center p-4 bg-[#181822] border-t border-dark-border-color hover:opacity-50 transition-opacity duration-200"
                                >
                                    View Restrictions <Eye size={16} className="ml-2" />
                                </button>
                            </div>
                        </div>
                    );
                })}

            </div>

            {/* Policy Details Modal */}
            <Modal
                isOpen={!!selectedPolicy}
                onRequestClose={() => setSelectedPolicy(null)}
                shouldCloseOnOverlayClick
                className={`
                    w-full max-w-[500px] mx-auto
                    bg-[#0d0d12] p-5
                    rounded-xl
                    transition-all duration-300
                    animate-drawer-slide-up 
                    max-h-[90vh] overflow-y-auto
                    pb-8
                `}
                overlayClassName={`
                    fixed inset-0 z-20 bg-black/40 backdrop-blur-md
                    flex items-end md:items-center justify-center
                `}
            >
                <button
                    onClick={() => setSelectedPolicy(null)}
                    className="modal-close-btn absolute top-[15px] right-[15px]  w-[30px] h-[30px]  flex justify-center items-center transition-all duration-300 rounded-full text-xs underline"
                >
                    <X size={24} className="text-gray" />
                </button>
                {selectedPolicy && (
                    <div className="relative">
                        <div className="space-y-2 mt-4">
                            <h2 className="text-lg font-semibold text-white mb-0">
                                Restrictions List for {selectedPolicy.id}
                            </h2>
                            <p className='mb-4 text-gray text-sm'> Total {selectedPolicy.policy_details.ChainSigTransaction.restrictions.length} restrictions</p>
                            {selectedPolicy.policy_details.ChainSigTransaction.restrictions.map(
                                (r: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="p-3 bg-[#131319] rounded-md text-sm flex flex-col gap-4"
                                    >
                                        <div className='flex justify-between items-center'>
                                            <p className=' text-gray'>Method</p>
                                            <p>{r.method}</p>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <p className=' text-gray'>Contract</p>
                                            <p>{r.contract_id}</p>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <p className=' text-gray'>Interface</p>
                                            <p>ERC20 ABI (base64)</p>
                                        </div>
                                        <div className='flex justify-between'>
                                            <p className=' text-gray'>Schema</p>
                                            <div className='text-right'>
                                                {r.schema.map((s: any, i: number) => (
                                                    <div key={i} className='mb-2'>
                                                        {s.path} - {s.type} {s.lte ? `(max: ${s.lte})` : ""}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
