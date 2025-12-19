import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isMobile } from "../utils/isMobile";

export default function MobileRedirectGuard({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    // Ne pas rediriger si déjà sur la page téléphone ou sur login/register/forgot/reset
    const excluded = ["/phone-settings", "/login", "/register", "/forgot-password", "/reset-password"];
    if (
      isMobile() &&
      token &&
      !excluded.includes(location.pathname)
    ) {
      navigate("/phone-settings", { replace: true });
    }
  }, [location, navigate]);

  return children;
}
