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

import { Toaster } from "sonner";

export default function App() {
  return (
    <Router>
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
      </div>
    </Router>
  );
}
