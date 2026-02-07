import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Alert } from "antd";
import { useAuth0 } from "@auth0/auth0-react";
import { useMe } from "../state/me";

export function SellerRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth0();
  const { me } = useMe();

  // pas connecté => login obligatoire
  if (!isAuthenticated) return <Navigate to="/" replace />;

  // me pas encore dispo => on laisse la page se charger (ou tu peux mettre un Spinner)
  if (!me) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="info"
          message="Chargement"
          description="Synchronisation du profil en cours…"
          showIcon
        />
      </div>
    );
  }

  const roles = (me as any).roles ?? [];
  const isSeller = Array.isArray(roles) && roles.includes("SELLER");

  if (!isSeller) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message="Accès refusé"
          description="Cette page est réservée aux vendeurs (SELLER)."
          showIcon
        />
      </div>
    );
  }

  return <>{children}</>;
}
