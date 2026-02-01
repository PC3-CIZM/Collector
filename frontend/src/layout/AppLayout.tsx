import { Outlet } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { layout, styles } from "../styles/ui";
import { Header } from "./Header";
import { MeProvider, useMe } from "../state/me";
import { DisplayNameModal } from "../components/profile/DisplayNameModal";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function AppShell() {
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();
  const { me, setMe } = useMe();

  const [syncError, setSyncError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const sync = async () => {
      if (!isAuthenticated) {
        setMe(null);
        setSyncError(null);
        return;
      }

      const email = user?.email ?? null;
      const role = sessionStorage.getItem("register_role"); // "BUYER" | "SELLER" | null

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const token = await getAccessTokenSilently();

          const res = await fetch(`${import.meta.env.VITE_API_URL}/me/sync`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, role }),
          });

          if (!res.ok) throw new Error(await res.text());
          const dbUser = await res.json();

          if (role) {
            sessionStorage.removeItem("register_role");
          }

          setMe(dbUser);
          setSyncError(null);
          return;
        } catch (e: any) {
          if (attempt === 3) {
            setSyncError(e?.message ?? String(e));
            return;
          }
          await sleep(250 * attempt);
        }
      }
    };

    void sync();
  }, [isAuthenticated, user?.email, getAccessTokenSilently, setMe]);

  const needsDisplayName = useMemo(
    () => isAuthenticated && me !== null && !me.displayName,
    [isAuthenticated, me]
  );

  const saveDisplayName = async (displayName: string) => {
    try {
      setModalError(null);
      const token = await getAccessTokenSilently();

      const res = await fetch(`${import.meta.env.VITE_API_URL}/me/display-name`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName }),
      });

      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();

      setMe((prev) => (prev ? { ...prev, displayName: updated.displayName } : prev));
    } catch (e: any) {
      setModalError(e?.message ?? String(e));
    }
  };

  return (
    <div style={layout.shell}>
      <Header />
      <main style={layout.content}>
        <div style={layout.card}>
          {syncError ? (
            <p style={styles.error}>Sync DB (/me/sync) a échoué : {syncError}</p>
          ) : null}
          <Outlet />
        </div>
      </main>

      <DisplayNameModal
        isOpen={!!needsDisplayName}
        onSave={saveDisplayName}
        error={modalError}
      />
    </div>
  );
}

export function AppLayout() {
  return (
    <MeProvider>
      <AppShell />
    </MeProvider>
  );
}
