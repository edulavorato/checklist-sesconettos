import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "Início" },
  { to: "/historico", label: "Histórico" },
  { to: "/gestao", label: "Gestão" },
  { to: "/perfil", label: "Perfil" },
];

export default function BottomNav() {
  return (
    <div className="tabbar">
      {TABS.map((tab) => (
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
