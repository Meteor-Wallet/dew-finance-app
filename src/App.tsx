import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Policy from "./pages/Policy";
import Vaults from "./pages/Vaults";
import Navbar from "./components/layout/Navbar";
import OnboardingModal from "./components/modal/OnboardingModal";
import ConnectWalletModal from "./components/modal/ConnectWalletModal";
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
        <ConnectWalletModal />
        <Routes>
          <Route path="/" element={<Vaults />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="*" element={<Navigate replace to="/vaults" />} />
        </Routes>

        {/* Background Animation */}
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
