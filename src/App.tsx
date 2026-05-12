import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Homepage from "./pages/Homepage";
import Policy from "./pages/Policy";
import Vaults from "./pages/Vaults/index";
import { vaultUtils } from "./utils/vaultUtils";
import Navbar from "./components/layout/Navbar";
import OnboardingModal from "./components/modal/OnboardingModal";
import SimulateModal from "./components/modal/SimulateModal";
import DotGrid from "./components/utils/DotGrid";
import LightRays from "./components/utils/LightRays";
import ScrollToTop from "./components/utils/ScrollToTop";

import { Toaster } from "sonner";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Toaster position="bottom-center" />
      <div className="relative">
        <Navbar />
        <OnboardingModal />
        <SimulateModal />
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/:vaultContractId" element={<Vaults />} />
          <Route path="/:vaultContractId/policy" element={<Policy />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>

        {/* Background Animation */}
        <div
          className="fixed bottom-0 left-0 w-full h-full overflow-hidden "
          style={{ zIndex: "-2" }}
        >
          <DotGrid
            dotSize={3}
            gap={30}
            baseColor="#151b21ff"
            activeColor="#385645"
            proximity={120}
            shockRadius={250}
            shockStrength={5}
            resistance={750}
            returnDuration={1.5}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(0, 0, 0, 0) 70%, rgba(0, 0, 0, 1) 100%)",
            }}
          />
        </div>

        <div
          className="fixed top-0 left-0 w-full h-full overflow-hidden "
          style={{ zIndex: "-2" }}
        >
          <LightRays
            raysColor="#8693D9"
            raysOrigin="top-right"
            raysSpeed={0.3}
            lightSpread={1.5}
            rayLength={2}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0.2}
            distortion={0.05}
            className="opacity-[0.6]"
          />
        </div>
        <div
          className="fixed bottom-0 left-0 w-full h-full overflow-hidden "
          style={{ zIndex: "-2" }}
        >
          <LightRays
            raysColor="#455AC5"
            raysOrigin="bottom-left"
            raysSpeed={0.4}
            lightSpread={1.5}
            rayLength={4}
            followMouse={false}
            mouseInfluence={0.1}
            noiseAmount={0.2}
            distortion={0.05}
            className="opacity-[0.5]"
          />
        </div>
      </div>
    </Router>
  );
}
