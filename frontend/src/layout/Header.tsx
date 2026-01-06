import { NavLink, Link } from "react-router-dom";
import { layout } from "../styles/ui";
import { ProfileMenu } from "../components/auth/ProfileMenu";
import { useMe } from "../state/me";

export function Header() {
  const { me } = useMe();

  return (
    <header style={layout.header}>
      <div style={layout.headerLeft}>
        <Link to="/" style={layout.brand}>Collector.shop</Link>
        <nav style={layout.nav}>
          <NavLink to="/service1" style={({isActive}) => ({...layout.navLink, ...(isActive ? layout.navLinkActive : {})})}>
            Service1
          </NavLink>
          <NavLink to="/service2" style={({isActive}) => ({...layout.navLink, ...(isActive ? layout.navLinkActive : {})})}>
            Service2
          </NavLink>
        </nav>
      </div>

      <div style={layout.headerRight}>
        <ProfileMenu displayName={me?.displayName ?? undefined} />
      </div>
    </header>
  );
}
