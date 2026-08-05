import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { to: "/", label: "Início" },
  { to: "/historico", label: "Histórico" },
  { to: "/gestao", label: "Gestão", adminOnly: true },
  { to: "/perfil", label: "Perfil" },
];

export default function BottomNav() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const tabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div className="tabbar">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `tabitem ${isActive ? "active" : ""}`}
          end={tab.to === "/"}
        >
          <div className="tabdot" />
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
