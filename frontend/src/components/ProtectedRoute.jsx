import { Navigate } from "react-router-dom";

/**
 * Composant pour protéger les routes
 * - userOnly: bloque les admins et superadmins (pour pages utilisateur)
 * - adminOnly: bloque les utilisateurs normaux (pour pages admin)
 * - superAdminOnly: bloque tout le monde sauf les superadmins
 */
function ProtectedRoute({ children, userOnly = false, adminOnly = false, superAdminOnly = false }) {
  const token = localStorage.getItem("token");
  
  // Si pas de token, rediriger vers login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Récupérer le rôle depuis localStorage (stocké lors du login)
  let userRole = null;
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      userRole = user.role;
    }
  } catch (err) {
    // Erreur de parsing
    return <Navigate to="/login" replace />;
  }

  // Si on n'a pas de rôle, rediriger vers login
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // Si c'est une page réservée UNIQUEMENT aux superadmins
  if (superAdminOnly && userRole !== "superadmin") {
    return <Navigate to="/dashboard" replace />;
  }

  // Si c'est une page réservée aux utilisateurs normaux
  if (userOnly && (userRole === "admin" || userRole === "superadmin")) {
    return <Navigate to="/dashboard" replace />;
  }

  // Si c'est une page réservée aux admins
  if (adminOnly && userRole !== "admin" && userRole !== "superadmin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
