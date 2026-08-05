import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../firebase/auth";
import { getChecklistHistory } from "../firebase/firestore";
import BottomNav from "../components/BottomNav";

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await getChecklistHistory(user?.unitId || "unidade-demo");
        setHistory(data);
      } catch (err) {
        setErrorMsg("Não foi possível carregar o histórico: " + (err.message || "erro desconhecido"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const avg = history.length
    ? Math.round(history.reduce((s, h) => s + (h.finalScore || 0), 0) / history.length)
    : 0;
  const totalInconform = history.reduce((s, h) => s + (h.inconformities || 0), 0);

  return (
    <>
      <div className="topbar">
        <div className="topbar-row">
          <div>
            <div className="topbar-title">Histórico</div>
            <div className="topbar-sub">Sua unidade</div>
          </div>
          <button className="logout-btn muted" onClick={handleLogout} title="Sair da conta">
            Sair
          </button>
        </div>
      </div>
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-num">{avg}%</div><div className="kpi-label">MÉDIA GERAL</div></div>
          <div className="kpi"><div className="kpi-num">{totalInconform}</div><div className="kpi-label">INCONFORM.</div></div>
          <div className="kpi"><div className="kpi-num">{history.length}</div><div className="kpi-label">APLICAÇÕES</div></div>
        </div>
        {errorMsg && (
          <div style={{ background: "var(--warn-bg)", color: "var(--warn)", padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}
        <div className="section-label">Últimas aplicações</div>
        {loading && <p>Carregando...</p>}
        {!loading && history.length === 0 && <p>Nenhuma aplicação registrada ainda.</p>}
        {history.map((h) => (
          <div className="hist-row" key={h.id}>
            <div>
              <div>{h.templateId}</div>
              <div className="hist-meta">
                {h.finishedAt?.toDate ? h.finishedAt.toDate().toLocaleDateString("pt-BR") : "—"}
              </div>
            </div>
            <b style={{ color: h.finalScore >= 90 ? "#1aa15c" : "#b3630a" }}>{h.finalScore}</b>
          </div>
        ))}
      </div>
      <BottomNav />
    </>
  );
}
