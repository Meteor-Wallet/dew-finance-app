import React from "react";
import Dew1 from "../assets/dew1.svg";
import Dew2 from "../assets/dew2.svg";
import Hero from "../assets/hero.svg";
import { ChevronRight } from "lucide-react";
import TV from "../assets/fee_icon1.svg";
import TVL from "../assets/fee_icon3.svg";
import vaultIcon from "../assets/vault-icon.png";
import Near from "../assets/near.png";
import Arb from "../assets/arb.png";
import Btc from "../assets/btc.png";
import Dai from "../assets/dai-full.svg";

export default function Homepage() {

    const vaults = Array(5).fill({
        name: "Vault Name or Strategy Name",
        curator: "Curated by Dew Finance",
        asset: "NEAR",
        apy: "18.34%",
        tvl: "$36.2M",
    });

    return (
        <div className="min-h-screen mt-[50px]">

            <img src={Dew2} className="absolute top-[50vh] left-[-80px] w-[30px] dew-float" />
            <img src={Dew1} className="absolute top-[90vh] right-[-40px] w-[10px] dew-float2" />

            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-2 bg-[linear-gradient(139deg,#000000,#0C0C0C)] rounded-lg shadow-lg border border-dark-border-color relative flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className='absolute w-full h-full left-0 top-0 z-1 p-10'>
                            <h1 className="text-3xl font-medium mb-2 max-w-[60%]">
                                Build on Dew, Access Any Chain, Any Strategy
                            </h1>
                            <p className="text-gray text-base mb-6">
                                Institutional vaults for any token, any chain, any action.
                            </p>
                            <button className="flex-1 bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black transition-opacity duration-200 hover:opacity-50 py-3 rounded-sm font-bold text-base confirm-button-shadow relative px-6 mt-4">
                                Build Your Vault
                            </button>
                        </div>
                        <img src={Hero} className='absolute right-0 bottom-0 z-0' />

                    </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col gap-6">
                    <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-6 py-8 rounded-md border border-dark-border-color flex justify-between">
                        <div>
                            <p className="text-lg text-gray">Total Vaults</p>
                            <p className="text-4xl font-semibold">20</p>
                        </div>
                        <img src={TV} className='  h-[65px]' />
                    </div>

                    <div className="bg-[linear-gradient(139deg,#000000,#181822)] p-6 py-8 rounded-md border border-dark-border-color flex justify-between">
                        <div>
                            <p className="text-lg text-gray">Total Value Locked</p>
                            <p className="text-4xl font-semibold">$134M</p>
                        </div>
                        <img src={TVL} className='  h-[65px]' />
                    </div>
                </div>
            </div>

            {/* Vaults Table */}
            <div className="mt-10 bg-[linear-gradient(139deg,#000000,#181822)] rounded-lg border border-dark-border-color overflow-hidden mb-[50px]">
                <table className="w-full text-left border-collapse">
                    {/* Table Head */}
                    <thead className="bg-[#0F0F0F] border-b border-dark-border-color text-gray text-sm">
                        <tr>
                            <th className="px-6 py-4 font-normal">Vaults / Strategy Name</th>
                            <th className="px-6 py-4 font-normal">Benchmark Assets</th>
                            <th className="px-6 py-4 font-normal">Net APY</th>
                            <th className="px-6 py-4 font-normal">TVL</th>
                            <th className="px-6 py-4 font-normal">Supported Network</th>
                            <th className="px-6 py-4 font-normal"></th> {/* Arrow column */}
                        </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="divide-y divide-dark-border-color">
                        {vaults.map((vault, i) => (
                            <tr
                                key={i}
                                className="hover:bg-[#1A1A1A] transition text-base"
                            >
                                {/* Vault Info */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-[40px] h-[40px] relative">
                                            <img src={vaultIcon} alt="vault" />
                                            <img
                                                src={Near}
                                                className="absolute bottom-[-5px] right-[-5px] w-[25px] h-[25px]"
                                                alt="near"
                                            />
                                        </div>
                                        <div>
                                            <p className="font-normal text-base">{vault.name}</p>
                                            <p className="text-xs text-gray font-normal">{vault.curator}</p>
                                        </div>
                                    </div>
                                </td>

                                {/* Asset */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <img src={Near} className="w-[25px] h-[25px]" alt="asset" />
                                        <span className='text-base font-normal'>{vault.asset}</span>
                                    </div>
                                </td>

                                {/* APY */}
                                <td className="px-6 py-4 font-medium text-green text-base">{vault.apy}</td>

                                {/* TVL */}
                                <td className="px-6 py-4 text-base font-normal">{vault.tvl}</td>

                                {/* Networks */}
                                <td className="px-6 py-4">
                                    <div className='flex gap-1.5 items-center '>
                                        <img src={Near} alt={'NEAR'} className="w-[25px] h-[25px]" />
                                        <img src={Dai} alt={'Dai'} className="w-[25px] h-[25px] ml-[-10px]" />
                                        <img src={Arb} alt={'Arb'} className="w-[25px] h-[25px] ml-[-10px]" />
                                        <img src={Btc} alt={'Btc'} className="w-[25px] h-[25px] ml-[-10px]" />
                                        <span className='text-sm text-gray'> +13 </span>
                                    </div>
                                </td>

                                {/* Arrow */}
                                <td className="px-6 py-4">
                                    <button className='bg-[#1A1E22] rounded-full w-[25px] h-[25px] flex justify-center items-center'>
                                        <ChevronRight className="text-gray-400" size={15} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>


        </div>
    );

}
