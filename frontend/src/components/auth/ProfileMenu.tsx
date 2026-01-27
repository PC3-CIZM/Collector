import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthButtons } from "./AuthButtons";

type Props = { displayName?: string };

export function ProfileMenu({ displayName }: Props) {
  const { isAuthenticated, user, logout } = useAuth0();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!isAuthenticated) return <AuthButtons compact />;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 999,
          padding: "6px 10px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "#e8eaf0",
          cursor: "pointer",
        }}
      >
        {user?.picture ? (
          <img
            src={user.picture}
            alt="avatar"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          />
        ) : (
          <span style={{ fontSize: 18 }}>👤</span>
        )}

        <span style={{ fontWeight: 600, fontSize: 13, opacity: 0.9 }}>
          {displayName ?? user?.name ?? "Profil"}
        </span>

        <span style={{ opacity: 0.7 }}>▾</span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 44,
            width: 220,
            background: "#121726",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ padding: "8px 10px", opacity: 0.85, fontSize: 13 }}>
            Connecté en tant que
            <div style={{ fontWeight: 700, marginTop: 4 }}>
              {displayName ?? user?.email ?? "Utilisateur"}
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "8px 0" }} />

          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              color: "#e8eaf0",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
}
