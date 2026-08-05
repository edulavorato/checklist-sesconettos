import { useLocation, useNavigate } from "react-router-dom";
import ScoreRing from "../components/ScoreRing";

export default function SummaryPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result;

  if (!result) {
    return (
      <div className="content">
        <p>Nenhum resultado para exibir. Volte ao início e responda um checklist.</p>
        <button className="btn" onClick={() => navigate("/")}>Voltar ao início</button>
      </div>
    );
  }

  return (
    <>
      <div className="topbar brand">
        <div className="topbar-title">Checklist concluído</div>
        <div className="topbar-sub">Resultado da aplicação</div>
      </div>
      <div className="content">
        <ScoreRing score={result.finalScore} />
        {result.areaResults.map((a) => (
          <div className="area-result-row" key={a.areaId}>
            <b>{a.areaName}</b>
            <span className="pct" style={{ color: a.pct === 100 ? "#1aa15c" : "#b3630a" }}>
              {a.ok}/{a.total}
            </span>
          </div>
        ))}
        <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", marginTop: 10 }}>
          {result.inconformities > 0
            ? `${result.inconformities} inconformidade(s) identificada(s)`
            : "Nenhuma inconformidade — checklist 100% conforme"}
        </p>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate("/")}>
          Voltar ao início
        </button>
      </div>
    </>
  );
}
