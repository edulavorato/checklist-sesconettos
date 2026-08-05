import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTemplate } from "../data/checklistTemplates";
import { getPhotosForRun } from "../firebase/photos";
import { generateChecklistPDF } from "../logic/pdfReport";
import ScoreRing from "../components/ScoreRing";

export default function SummaryPage() {
  const { state } = useLocation();
  const { templateId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const result = state?.result;
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!result) {
    return (
      <div className="content">
        <p>Nenhum resultado para exibir. Volte ao início e responda um checklist.</p>
        <button className="btn" onClick={() => navigate("/")}>Voltar ao início</button>
      </div>
    );
  }

  async function handleGeneratePDF() {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const template = getTemplate(templateId);
      const photos = state?.runId ? await getPhotosForRun(state.runId) : {};
      await generateChecklistPDF({
        template,
        result,
        responses: state?.responses || {},
        photos,
        user,
        unitId: state?.unitId,
        startedAt: state?.startedAt ? new Date(state.startedAt) : null,
        finishedAt: state?.finishedAt ? new Date(state.finishedAt) : new Date(),
        runId: state?.runId,
      });
    } catch (err) {
      setErrorMsg("Não foi possível gerar o PDF: " + (err.message || "erro desconhecido"));
    } finally {
      setGenerating(false);
    }
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
            <span className="pct" style={{ color: a.pct === 100 ? "var(--ok)" : "var(--caution)" }}>
              {a.ok}/{a.total}
            </span>
          </div>
        ))}
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--sub)", marginTop: 10 }}>
          {result.inconformities > 0
            ? `${result.inconformities} inconformidade(s) identificada(s)`
            : "Nenhuma inconformidade — checklist 100% conforme"}
        </p>

        {errorMsg && (
          <div style={{ background: "var(--warn-bg)", color: "var(--warn)", padding: "10px 12px", borderRadius: 8, marginTop: 14, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        <button
          className="btn"
          style={{ marginTop: 18, background: "var(--accent-dark)" }}
          disabled={generating}
          onClick={handleGeneratePDF}
        >
          {generating && <span className="spinner" />}
          {generating ? "Gerando PDF..." : "⬇ Gerar PDF do resultado"}
        </button>
        <button className="btn" style={{ marginTop: 10 }} onClick={() => navigate("/")}>
          Voltar ao início
        </button>
      </div>
    </>
  );
}
