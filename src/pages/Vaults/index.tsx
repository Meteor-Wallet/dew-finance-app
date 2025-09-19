import Dew1 from "../../assets/dew1.svg";
import Dew2 from "../../assets/dew2.svg";
import Dew3 from "../../assets/dew3.svg";
import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";

export default function Vaults() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row gap-6 mt-[50px]">
      <img
        src={Dew1}
        className="absolute top-[50vh] left-[-80px] w-[30px] dew-float"
      />
      <img
        src={Dew2}
        className="absolute top-[90vh] right-[-40px] w-[10px] dew-float2"
      />
      <img
        src={Dew3}
        className="absolute bottom-[10vh] right-[-40px] w-[10px] dew-float3"
      />

      
      <LeftPanel />
      <RightPanel />

    </div>
  );
}
