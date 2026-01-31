import { NavLink, Link } from "react-router-dom";
import { layout } from "../styles/ui";
import { ProfileMenu } from "../components/auth/ProfileMenu";
import { useMe, isAdmin, isSeller } from "../state/me";

export function Header() {
  const { me } = useMe();
  const admin = isAdmin(me);
  const seller = isSeller(me);

  return (
    <header style={layout.header}>
      <div style={layout.headerLeft}>
        <Link to="/" style={layout.brand}>Collector.shop</Link>

        <nav style={layout.nav}>
          <NavLink to="/service1" style={({ isActive }) => ({
            ...layout.navLink,
            ...(isActive ? layout.navLinkActive : {}),
          })}>
            Service1
          </NavLink>

          <NavLink to="/service2" style={({ isActive }) => ({
            ...layout.navLink,
            ...(isActive ? layout.navLinkActive : {}),
          })}>
            Service2
          </NavLink>

          {seller && (
            <NavLink
              to="/seller/items"
              style={({ isActive }) => ({
                ...layout.navLink,
                ...(isActive ? layout.navLinkActive : {}),
              })}
            >
              Vendeur
            </NavLink>
          )}

          {admin && (
            <NavLink
              to="/admin"
              style={({ isActive }) => ({
                ...layout.navLink,
                ...(isActive ? layout.navLinkActive : {}),
              })}
            >
              Admin
            </NavLink>
          )}
        </nav>
      </div>

      <div style={layout.headerRight}>
        <ProfileMenu displayName={me?.displayName ?? undefined} />
      </div>
    </header>
  );
}
