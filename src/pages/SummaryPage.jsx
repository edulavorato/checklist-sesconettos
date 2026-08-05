import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTemplate } from "../data/checklistTemplates";
import { getPhotosForRun } from "../firebase/photos";
import { getChecklistHistory, saveRunSignature } from "../firebase/firestore";
import { generateChecklistPDF } from "../logic/pdfReport";
import { toScoreSeries } from "../logic/reports";
import { scoreChecklist } from "../logic/scoring";
import { reverseGeocode, formatCoords } from "../logic/geo";
import ScoreRing from "../components/ScoreRing";
import SignaturePad from "../components/SignaturePad";

export default function SummaryPage() {
  const { state } = useLocation();
  const { templateId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const result = state?.result;
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [startAddress, setStartAddress] = useState(null);
  const [endAddress, setEndAddress] = useState(null);
  const [historySeries, setHistorySeries] = useState([]);
  const [variationByArea, setVariationByArea] = useState({});
  const [previousRunDate, setPreviousRunDate] = useState(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [savingSignature, setSavingSignature] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  useEffect(() => {
    if (state?.startLocation) {
      reverseGeocode(state.startLocation.lat, state.startLocation.lng).then(setStartAddress);
    }
    if (state?.endLocation) {
      reverseGeocode(state.endLocation.lat, state.endLocation.lng).then(setEndAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca o histórico da unidade para este checklist, tanto para montar o
  // gráfico "Últimos resultados" quanto para calcular a variação por área
  // em relação à aplicação anterior (mostrada na tela e no PDF).
  useEffect(() => {
    async function loadComparison() {
      if (!state?.unitId) return;
      try {
        const unitHistory = await getChecklistHistory(state.unitId);
        const sameChecklist = unitHistory
          .filter((r) => r.templateId === templateId && r.status === "concluido" && r.id !== state?.runId)
          .sort((a, b) => {
            const da = a.finishedAt?.toDate ? a.finishedAt.toDate().getTime() : 0;
            const db = b.finishedAt?.toDate ? b.finishedAt.toDate().getTime() : 0;
            return db - da;
          });
        setHistorySeries(toScoreSeries(sameChecklist, 6));

        const previousRun = sameChecklist[0];
        if (previousRun) {
          const template = getTemplate(templateId);
          const previousResult = scoreChecklist(template, previousRun.responses || {});
          const map = {};
          previousResult.areaResults.forEach((a) => {
            map[a.areaId] = a.pct;
          });
          const delta = {};
          (result?.areaResults || []).forEach((a) => {
            if (map[a.areaId] !== undefined) {
              delta[a.areaId] = a.pct - map[a.areaId];
            }
          });
          setVariationByArea(delta);
          setPreviousRunDate(previousRun.finishedAt?.toDate ? previousRun.finishedAt.toDate() : null);
        }
      } catch {
        // Sem histórico disponível ainda — segue sem comparação, sem quebrar a tela.
      }
    }
    loadComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.unitId, templateId]);

  if (!result) {
    return (
      <div className="content">
        <p>Nenhum resultado para exibir. Volte ao início e responda um checklist.</p>
        <button className="btn" onClick={() => navigate("/")}>Voltar ao início</button>
      </div>
    );
  }

  const authorName = profile?.displayName || user?.email || "—";
  const authorRole = profile?.cargo || null;

  async function handleSaveSignature() {
    if (!signatureDataUrl || !state?.runId) return;
    setSavingSignature(true);
    setErrorMsg(null);
    try {
      await saveRunSignature(state.runId, {
        signature: signatureDataUrl,
        signedBy: authorName,
        signedRole: authorRole,
      });
      setSignatureSaved(true);
    } catch (err) {
      setErrorMsg("Não foi possível salvar a assinatura: " + (err.message || "erro desconhecido"));
    } finally {
      setSavingSignature(false);
    }
  }

  async function handleGeneratePDF() {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const template = getTemplate(templateId);
      const photos = state?.runId ? await getPhotosForRun(state.runId) : {};

      // Se a pessoa desenhou a assinatura mas ainda não salvou explicitamente,
      // salva agora junto — assim o PDF sempre reflete o que está na tela.
      if (signatureDataUrl && !signatureSaved && state?.runId) {
        try {
          await saveRunSignature(state.runId, {
            signature: signatureDataUrl,
            signedBy: authorName,
            signedRole: authorRole,
          });
          setSignatureSaved(true);
        } catch {
          // Não bloqueia a geração do PDF por causa disso — a assinatura
          // ainda vai para o PDF, só não fica salva no histórico.
        }
      }

      await generateChecklistPDF({
        template,
        result,
        responses: state?.responses || {},
        photos,
        user,
        authorName,
        authorRole,
        signatureDataUrl,
        unitId: state?.unitId,
        startedAt: state?.startedAt ? new Date(state.startedAt) : null,
        finishedAt: state?.finishedAt ? new Date(state.finishedAt) : new Date(),
        runId: state?.runId,
        startLocation: state?.startLocation,
        endLocation: state?.endLocation,
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

  const hasLocation = state?.startLocation || state?.endLocation;

  return (
    <>
      <div className="topbar brand">
        <div className="topbar-title">Checklist concluído</div>
        <div className="topbar-sub">Resultado da aplicação</div>
      </div>
      <div className="content">
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
                    title="Variação em relação à aplicação anterior"
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

        {hasLocation && (
          <>
            <div className="section-label" style={{ marginTop: 16 }}>Localização da aplicação</div>
            <div className="card" style={{ cursor: "default" }}>
              {state?.startLocation && (
                <div style={{ marginBottom: state?.endLocation ? 10 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Início</div>
                  <div style={{ fontSize: 12.5 }}>{startAddress || formatCoords(state.startLocation)}</div>
                  {startAddress && <div style={{ fontSize: 10.5, color: "var(--sub)" }}>{formatCoords(state.startLocation)}</div>}
                </div>
              )}
              {state?.endLocation && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Final</div>
                  <div style={{ fontSize: 12.5 }}>{endAddress || formatCoords(state.endLocation)}</div>
                  {endAddress && <div style={{ fontSize: 10.5, color: "var(--sub)" }}>{formatCoords(state.endLocation)}</div>}
                </div>
              )}
            </div>
          </>
        )}

        <div className="section-label" style={{ marginTop: 16 }}>Assinatura de conclusão</div>
        <div className="card" style={{ cursor: "default" }}>
          <SignaturePad
            onChange={(dataUrl) => {
              setSignatureDataUrl(dataUrl);
              setSignatureSaved(false);
            }}
          />
          <p style={{ fontSize: 11, color: "var(--sub)", marginTop: 8, marginBottom: 0 }}>
            {authorRole ? `${authorName} · ${authorRole}` : authorName}
          </p>
          {signatureDataUrl && (
            <button
              type="button"
              className="btn outline"
              style={{ marginTop: 10, padding: "8px 12px", fontSize: 12.5 }}
              disabled={savingSignature || signatureSaved}
              onClick={handleSaveSignature}
            >
              {savingSignature ? "Salvando..." : signatureSaved ? "Assinatura salva ✓" : "Salvar assinatura"}
            </button>
          )}
        </div>

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
