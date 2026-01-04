import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { buildApiUrl } from "./apiConfig";
import { LanguageProvider } from "./contexts/LanguageContext.jsx";
import MobileRedirectGuard from "./components/MobileRedirectGuard.jsx";
import MobileFrame from "./components/MobileFrame.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
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
import DocumentationPage from "./pages/DocumentationPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";


function App() {
  useEffect(() => {
    const ping = () => {
      fetch(buildApiUrl("/api/ping")).catch(() => {});
    };

    ping();
    const intervalId = setInterval(ping, 2 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <LanguageProvider>
      <BrowserRouter>
        <MobileFrame>
          <MobileRedirectGuard>
            <Routes>
          {/* Page d'accueil */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/documentation" element={<DocumentationPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Dashboard (accessible pour tous) */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Pages réservées aux UTILISATEURS (admin bloqué) */}
          <Route
            path="/deposit"
            element={
              <ProtectedRoute userOnly={true}>
                <DepositPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referrals"
            element={
              <ProtectedRoute userOnly={true}>
                <ReferralsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/withdraw"
            element={
              <ProtectedRoute userOnly={true}>
                <WithdrawPage />
              </ProtectedRoute>
            }
          />

          {/* Pages réservées aux ADMINS */}
          <Route
            path="/admin/withdrawals"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminWithdrawalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/deposits"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDepositsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tasks"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/finance"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminFinancePage />
              </ProtectedRoute>
            }
          />
          {/* Page réservée UNIQUEMENT aux SUPERADMINS */}
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute superAdminOnly={true}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all route - 404 redirect to landing page */}
          <Route path="*" element={<LandingPage />} />

              </Routes>
            </MobileRedirectGuard>
          </MobileFrame>
        </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
