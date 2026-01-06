import { useState } from "react";
import { styles } from "../../styles/ui";

type Props = {
  isOpen: boolean;
  onSave: (displayName: string) => Promise<void>;
  error?: string | null;
};

export function DisplayNameModal({ isOpen, onSave, error }: Props) {
  const [value, setValue] = useState("");

  if (!isOpen) return null;

  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <div style={modal}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Choisis un display name</h2>

        <p style={styles.muted}>
          3–30 caractères. Lettres/chiffres + <code>_</code> ou <code>-</code>.
        </p>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ex: math_nowa"
          autoFocus
          style={input}
        />

        {error ? <p style={{ ...styles.error, marginTop: 10 }}>{error}</p> : null}

        <div style={{ ...styles.actions, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={styles.primaryBtn} onClick={() => onSave(value)}>
            Enregistrer
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
  zIndex: 50,
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

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.04)",
  color: "#e8eaf0",
  outline: "none",
};
