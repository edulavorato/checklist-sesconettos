// Relatório de uma aplicação de checklist já concluída — acessível a partir
// de uma linha no Histórico ou no Painel de Gestão. Diferente da SummaryPage
// (que mostra o resultado logo após concluir, usando dados ainda em memória),
// esta tela busca tudo direto do Firestore a partir do id da aplicação, então
// funciona para qualquer checklist antigo, de qualquer sessão.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTemplate } from "../data/checklistTemplates";
import { getChecklistRun, getChecklistHistory } from "../firebase/firestore";
import { getPhotosForRun } from "../firebase/photos";
import { generateChecklistPDF } from "../logic/pdfReport";
import { toScoreSeries } from "../logic/reports";
import { scoreChecklist } from "../logic/scoring";
import { reverseGeocode, formatCoords } from "../logic/geo";
import ScoreRing from "../components/ScoreRing";

export default function HistoryDetailPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [result, setResult] = useState(null);
  const [photos, setPhotos] = useState({});
  const [variationByArea, setVariationByArea] = useState({});
  const [previousRunDate, setPreviousRunDate] = useState(null);
  const [historySeries, setHistorySeries] = useState([]);
  const [startAddress, setStartAddress] = useState(null);
  const [endAddress, setEndAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const runData = await getChecklistRun(runId);
        if (!runData) {
          setErrorMsg("Aplicação não encontrada.");
          return;
        }
        setRun(runData);

        const template = getTemplate(runData.templateId);
        if (template) {
          setResult(scoreChecklist(template, runData.responses || {}));
        }

        getPhotosForRun(runId).then(setPhotos).catch(() => setPhotos({}));

        if (runData.startLocation) {
          reverseGeocode(runData.startLocation.lat, runData.startLocation.lng).then(setStartAddress);
        }
        if (runData.endLocation) {
          reverseGeocode(runData.endLocation.lat, runData.endLocation.lng).then(setEndAddress);
        }

        if (runData.unitId) {
          const unitHistory = await getChecklistHistory(runData.unitId);
          const currentFinished = runData.finishedAt?.toDate ? runData.finishedAt.toDate().getTime() : 0;
          const sameChecklist = unitHistory
            .filter((r) => r.templateId === runData.templateId && r.status === "concluido" && r.id !== runId)
            .sort((a, b) => {
              const da = a.finishedAt?.toDate ? a.finishedAt.toDate().getTime() : 0;
              const db = b.finishedAt?.toDate ? b.finishedAt.toDate().getTime() : 0;
              return db - da;
            });
          setHistorySeries(toScoreSeries(sameChecklist, 6));

          const previousRun = sameChecklist.find((r) => {
            const t = r.finishedAt?.toDate ? r.finishedAt.toDate().getTime() : 0;
            return t < currentFinished;
          });
          if (previousRun && template) {
            const previousResult = scoreChecklist(template, previousRun.responses || {});
            const map = {};
            previousResult.areaResults.forEach((a) => { map[a.areaId] = a.pct; });
            const delta = {};
            const currentResult = scoreChecklist(template, runData.responses || {});
            currentResult.areaResults.forEach((a) => {
              if (map[a.areaId] !== undefined) delta[a.areaId] = a.pct - map[a.areaId];
            });
            setVariationByArea(delta);
            setPreviousRunDate(previousRun.finishedAt?.toDate ? previousRun.finishedAt.toDate() : null);
          }
        }
      } catch (err) {
        if (err.code === "permission-denied") {
          setErrorMsg("Você não tem permissão para ver o relatório de outra unidade.");
        } else {
          setErrorMsg("Não foi possível carregar essa aplicação: " + (err.message || "erro desconhecido"));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [runId]);

  async function handleGeneratePDF() {
    if (!run || !result) return;
    setGenerating(true);
    setErrorMsg(null);
    try {
      const template = getTemplate(run.templateId);
      await generateChecklistPDF({
        template,
        result,
        responses: run.responses || {},
        photos,
        authorName: run.signedBy || "—",
        authorRole: run.signedRole || null,
        signatureDataUrl: run.signature || null,
        unitId: run.unitId,
        startedAt: run.startedAt?.toDate ? run.startedAt.toDate() : null,
        finishedAt: run.finishedAt?.toDate ? run.finishedAt.toDate() : new Date(),
        runId: run.id,
        startLocation: run.startLocation,
        endLocation: run.endLocation,
        startAddress,
        endAddress,
        historySeries,
        variationByArea,
      });
    } catch (err) {
      setErrorMsg("Não foi possível gerar o PDF: " + (err.message || "erro desconhecido"));
    } finally {
      setGenerating(false);
    }
  }

  const template = run ? getTemplate(run.templateId) : null;
  const finishedLabel = run?.finishedAt?.toDate
    ? run.finishedAt.toDate().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "—";
  const hasLocation = run?.startLocation || run?.endLocation;

  return (
    <>
      <div className="topbar brand">
        <div className="topbar-row">
          <div>
            <div className="topbar-title">{template?.name || run?.templateId || "Relatório"}</div>
            <div className="topbar-sub">{run?.unitId} · {finishedLabel}</div>
          </div>
          <button className="logout-btn muted" onClick={() => navigate(-1)} title="Voltar">
            ← Voltar
          </button>
        </div>
      </div>
      <div className="content">
        {loading && <p>Carregando...</p>}
        {errorMsg && (
          <div style={{ background: "var(--warn-bg)", color: "var(--warn)", padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        {!loading && result && (
          <>
            <ScoreRing score={result.finalScore} />
            {result.areaResults.map((a) => {
              const delta = variationByArea[a.areaId];
              return (
                <div className="area-result-row" key={a.areaId}>
                  <b>{a.areaName}</b>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {delta !== undefined && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: delta > 0 ? "var(--ok)" : delta < 0 ? "var(--warn)" : "var(--sub)",
                        }}
                      >
                        {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta)}%
                      </span>
                    )}
                    <span className="pct" style={{ color: a.pct === 100 ? "var(--ok)" : "var(--caution)" }}>
                      {a.ok}/{a.total}
                    </span>
                  </span>
                </div>
              );
            })}
            {previousRunDate && (
              <p style={{ textAlign: "center", fontSize: 11, color: "var(--sub)", marginTop: -4 }}>
                Comparado com a aplicação de {previousRunDate.toLocaleDateString("pt-BR")}
              </p>
            )}
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--sub)", marginTop: 10 }}>
              {result.inconformities > 0
                ? `${result.inconformities} inconformidade(s) identificada(s)`
                : "Nenhuma inconformidade — checklist 100% conforme"}
            </p>

            {run?.signedBy && (
              <>
                <div className="section-label" style={{ marginTop: 16 }}>Geral</div>
                <div className="card" style={{ cursor: "default" }}>
                  {run.signature && (
                    <img
                      src={run.signature}
                      alt="Assinatura"
                      style={{ maxWidth: 180, maxHeight: 70, border: "1px solid var(--line)", borderRadius: 6, background: "#fff" }}
                    />
                  )}
                  <p style={{ fontSize: 12.5, fontWeight: 700, marginTop: 6, marginBottom: 0 }}>{run.signedBy}</p>
                  {run.signedRole && <p style={{ fontSize: 11, color: "var(--sub)", margin: 0 }}>{run.signedRole}</p>}
                </div>
              </>
            )}

            {hasLocation && (
              <>
                <div className="section-label" style={{ marginTop: 16 }}>Localização da aplicação</div>
                <div className="card" style={{ cursor: "default" }}>
                  {run.startLocation && (
                    <div style={{ marginBottom: run.endLocation ? 10 : 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Início</div>
                      <div style={{ fontSize: 12.5 }}>{startAddress || formatCoords(run.startLocation)}</div>
                    </div>
                  )}
                  {run.endLocation && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Final</div>
                      <div style={{ fontSize: 12.5 }}>{endAddress || formatCoords(run.endLocation)}</div>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              className="btn"
              style={{ marginTop: 18, background: "var(--accent-dark)" }}
              disabled={generating}
              onClick={handleGeneratePDF}
            >
              {generating && <span className="spinner" />}
              {generating ? "Gerando PDF..." : "⬇ Baixar PDF deste relatório"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
