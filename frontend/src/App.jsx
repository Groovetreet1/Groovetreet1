import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import WithdrawPage from "./pages/WithdrawPage.jsx";
// (optionnel, si tu as cette page)
import AdminWithdrawalsPage from "./pages/AdminWithdrawalsPage.jsx";
import AdminTasksPage from "./pages/AdminTasksPage.jsx";
import AdminDepositsPage from "./pages/AdminDepositsPage.jsx";
import AdminFinancePage from "./pages/AdminFinancePage.jsx";
import ReferralsPage from "./pages/ReferralsPage.jsx";
import DepositPage from "./pages/DepositPage.jsx";
import SuperAdminDashboard from "./pages/SuperAdminDashboard.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Page d'accueil */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Dashboard utilisateur */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/deposit" element={<DepositPage />} />
        <Route path="/referrals" element={<ReferralsPage />} />

        {/* Page de retrait */}
        <Route path="/withdraw" element={<WithdrawPage />} />

        {/* Admin retraits (si existe) */}
        <Route
          path="/admin/withdrawals"
          element={<AdminWithdrawalsPage />}
        />
        <Route
          path="/admin/deposits"
          element={<AdminDepositsPage />}
        />
        <Route
          path="/admin/tasks"
          element={<AdminTasksPage />}
        />
        <Route
          path="/admin/finance"
          element={<AdminFinancePage />}
        />
        <Route
          path="/superadmin"
          element={<SuperAdminDashboard />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
