import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../firebase/auth";
import { CHECKLIST_TEMPLATES } from "../data/checklistTemplates";
import BottomNav from "../components/BottomNav";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const templates = Object.values(CHECKLIST_TEMPLATES);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <>
      <div className="topbar brand">
        <div className="topbar-row">
          <div>
            <div className="topbar-title">Olá, {user?.email?.split("@")[0] || "usuário"}</div>
            <div className="topbar-sub">Sua unidade</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sair da conta">
            Sair
          </button>
        </div>
      </div>
      <div className="content">
        <div className="section-label">Checklists de hoje</div>
        {templates.map((t) => (
          <div
            key={t.id}
            className="card"
            onClick={() => navigate(`/checklist/${t.id}`)}
          >
            <div className="card-row">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="card-icon">🔥</div>
                <div>
                  <div className="card-title">{t.name}</div>
                  <div className="card-meta">{t.schedule}</div>
                </div>
              </div>
              <div className="badge pending">Pendente</div>
            </div>
          </div>
        ))}
        <div className="empty-hint">
          <span style={{ fontSize: 22 }}>📋</span>
          Novos checklists cadastrados pela gestão aparecerão aqui automaticamente.
        </div>
      </div>
      <BottomNav />
    </>
  );
}
