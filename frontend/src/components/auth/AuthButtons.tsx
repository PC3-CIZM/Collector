import { useAuth0 } from "@auth0/auth0-react";
import { styles } from "../../styles/ui";

type Props = { compact?: boolean };

export function AuthButtons({ compact }: Props) {
  const { loginWithPopup, loginWithRedirect } = useAuth0();

  const safeLogin = async (authorizationParams: Record<string, string>) => {
    try {
      await loginWithPopup({ authorizationParams });
    } catch (err) {
      console.warn("Auth0 popup failed, fallback redirect", err);
      await loginWithRedirect({ authorizationParams });
    }
  };

  const btnStylePrimary = compact
    ? { ...styles.primaryBtn, padding: "8px 10px", borderRadius: 10 }
    : styles.primaryBtn;

  const btnStyleSecondary = compact
    ? { ...styles.secondaryBtn, padding: "8px 10px", borderRadius: 10 }
    : styles.secondaryBtn;

  return (
    <div style={{ ...styles.actions, gap: 8 }}>
      <button
        style={btnStylePrimary}
        onClick={() => void safeLogin({ prompt: "login" })}
      >
        Login
      </button>
      <button
        style={btnStyleSecondary}
        onClick={() => void safeLogin({ screen_hint: "signup" })}
      >
        Register
      </button>
    </div>
  );
}
