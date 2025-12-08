import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import WithdrawPage from "./pages/WithdrawPage.jsx";
import AdminWithdrawalsPage from "./pages/AdminWithdrawalsPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/withdraw" element={<WithdrawPage />} />
      <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
      <Route path="/" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
