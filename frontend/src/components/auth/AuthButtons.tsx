import { useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";
import { styles } from "../../styles/ui";
import { RegisterRoleModal } from "./RegisterRoleModal";

type Props = {
  compact?: boolean;
};

export function AuthButtons({ compact }: Props) {
  const { loginWithPopup, loginWithRedirect } = useAuth0();
  const [showRoleModal, setShowRoleModal] = useState(false);

  const safePopup = async (authorizationParams: Record<string, string>) => {
    try {
      await loginWithPopup({ authorizationParams });
    } catch (err) {
      console.warn("Auth0 popup failed, fallback to redirect", err);
      await loginWithRedirect({ authorizationParams });
    }
  };

  const login = async () => {
    await safePopup({ prompt: "login" });
  };

  const register = () => {
    setShowRoleModal(true);
  };

  const onChooseRole = async (role: "BUYER" | "SELLER") => {
    sessionStorage.setItem("register_role", role);
    await safePopup({ screen_hint: "signup" });
    setShowRoleModal(false);
  };

  const primaryBtn = compact
    ? { ...styles.primaryBtn, padding: "8px 10px", borderRadius: 10 }
    : styles.primaryBtn;

  const secondaryBtn = compact
    ? { ...styles.secondaryBtn, padding: "8px 10px", borderRadius: 10 }
    : styles.secondaryBtn;

  return (
    <>
      <div style={{ ...styles.actions, gap: 8 }}>
        <button style={primaryBtn} onClick={() => void login()}>
          Login
        </button>

        <button style={secondaryBtn} onClick={register}>
          Register
        </button>
      </div>

      {showRoleModal ? <RegisterRoleModal onSelect={onChooseRole} /> : null}
    </>
  );
}
