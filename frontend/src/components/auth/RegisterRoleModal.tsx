import { styles } from "../../styles/ui";

type Props = {
  onSelect: (role: "BUYER" | "SELLER") => void;
};

export function RegisterRoleModal({ onSelect }: Props) {
  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <div style={modal}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Créer un compte</h2>
        <p style={styles.muted}>Tu veux t’inscrire en tant que :</p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.primaryBtn} onClick={() => onSelect("BUYER")}>
            Acheteur
          </button>

          <button
            style={styles.secondaryBtn}
            onClick={() => onSelect("SELLER")}
          >
            Vendeur
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 60,
};

const modal: React.CSSProperties = {
  width: "min(520px, 100%)",
  background: "#121726",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 20,
  color: "#e8eaf0",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
};
