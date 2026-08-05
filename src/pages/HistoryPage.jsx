import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getChecklistHistory } from "../firebase/firestore";
import BottomNav from "../components/BottomNav";

export default function HistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getChecklistHistory(user?.unitId || "unidade-demo");
        setHistory(data);
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
        <div className="topbar-title">Histórico</div>
        <div className="topbar-sub">Sua unidade</div>
      </div>
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-num">{avg}%</div><div className="kpi-label">MÉDIA GERAL</div></div>
          <div className="kpi"><div className="kpi-num">{totalInconform}</div><div className="kpi-label">INCONFORM.</div></div>
          <div className="kpi"><div className="kpi-num">{history.length}</div><div className="kpi-label">APLICAÇÕES</div></div>
        </div>
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
