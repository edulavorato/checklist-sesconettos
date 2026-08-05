// Painel de gestão: visão agregada de todas as unidades — pensado para
// quem supervisiona (não necessariamente quem preenche o checklist no dia
// a dia). Hoje qualquer usuário autenticado acessa; quando o modelo de
// permissões (gerente x administrador) for definido, essa tela deve virar
// restrita a administradores.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllChecklistHistory } from "../firebase/firestore";
import { getTemplate, CHECKLIST_TEMPLATES } from "../data/checklistTemplates";
import { scoreChecklist } from "../logic/scoring";
import {
  groupByUnit,
  computeStats,
  computeTrend,
  toScoreSeries,
  downloadCSV,
  filterRuns,
  computeAreaInconformityRanking,
  computeUnitStatus,
} from "../logic/reports";
import { generateManagementPDF } from "../logic/pdfReport";
import TrendChart from "../components/TrendChart";
import BottomNav from "../components/BottomNav";

const PERIOD_OPTIONS = [
  { value: "", label: "Todo o período" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

export default function ManagementPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllChecklistHistory();
        setRuns(data);
      } catch (err) {
        setErrorMsg("Não foi possível carregar os dados: " + (err.message || "erro desconhecido"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredRuns = filterRuns(runs, {
    templateId: templateFilter,
    days: periodFilter ? Number(periodFilter) : null,
  });

  const overall = computeStats(filteredRuns);
  const trend = computeTrend(filteredRuns);
  const series = toScoreSeries(filteredRuns);
  const byUnit = groupByUnit(filteredRuns);
  const unitRows = Object.entries(byUnit).map(([unitId, unitRuns]) => {
    const stats = computeStats(unitRuns);
    return { unitId, ...stats, status: computeUnitStatus(stats.lastRun) };
  });
  const areaRanking = computeAreaInconformityRanking(filteredRuns, CHECKLIST_TEMPLATES, scoreChecklist).slice(0, 8);

  async function handleGeneratePDF() {
    setGenerating(true);
    setErrorMsg(null);
    try {
      await generateManagementPDF({
        overall,
        trend,
        series,
        unitRows,
        runs: filteredRuns,
        templates: CHECKLIST_TEMPLATES,
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
        <div className="topbar-row">
          <div>
            <div className="topbar-title">Painel de Gestão</div>
            <div className="topbar-sub">Todas as unidades</div>
          </div>
        </div>
      </div>
      <div className="content">
        {loading && <p>Carregando...</p>}
        {errorMsg && (
          <div style={{ background: "var(--warn-bg)", color: "var(--warn)", padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <select
                className="finput"
                style={{ margin: 0 }}
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
              >
                <option value="all">Todos os checklists</option>
                {Object.values(CHECKLIST_TEMPLATES).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                className="finput"
                style={{ margin: 0 }}
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="kpi-row">
              <div className="kpi">
                <div className="kpi-num">{overall.avgScore}%</div>
                <div className="kpi-label">MÉDIA GERAL</div>
              </div>
              <div className="kpi">
                <div className="kpi-num">{overall.totalInconformities}</div>
                <div className="kpi-label">INCONFORM.</div>
              </div>
              <div className="kpi">
                <div className="kpi-num">{overall.count}</div>
                <div className="kpi-label">APLICAÇÕES</div>
              </div>
            </div>

            {trend !== null && (
              <div style={{ fontSize: 12.5, color: trend >= 0 ? "var(--ok)" : "var(--warn)", fontWeight: 700, marginBottom: 14 }}>
                {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)} pontos vs. aplicações anteriores
              </div>
            )}

            <div className="section-label">Evolução da nota</div>
            <div className="card" style={{ cursor: "default", padding: 12 }}>
              <TrendChart series={series} />
            </div>

            <div className="section-label">Por unidade</div>
            {unitRows.map((u) => (
              <div className="hist-row" key={u.unitId}>
                <div>
                  <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    {u.unitId}
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 20,
                        color: u.status.stale ? "var(--warn)" : "var(--ok)",
                        background: u.status.stale ? "var(--warn-bg)" : "var(--ok-bg)",
                      }}
                    >
                      {u.status.label}
                    </span>
                  </div>
                  <div className="hist-meta">
                    {u.count} aplicação(ões) · {u.totalInconformities} inconform.
                    {u.status.lastDate && ` · última em ${u.status.lastDate.toLocaleDateString("pt-BR")}`}
                  </div>
                </div>
                <b style={{ color: u.avgScore >= 90 ? "var(--ok)" : "var(--caution)" }}>{u.avgScore}%</b>
              </div>
            ))}
            {!unitRows.length && <p style={{ fontSize: 12.5, color: "var(--sub)" }}>Nenhuma aplicação concluída ainda.</p>}

            {areaRanking.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 18 }}>Áreas com mais inconformidade</div>
                {areaRanking.map((a) => (
                  <div className="hist-row" key={`${a.templateId}::${a.areaName}`}>
                    <div>
                      <div>{a.areaName}</div>
                      <div className="hist-meta">{getTemplate(a.templateId)?.name || a.templateId}</div>
                    </div>
                    <b style={{ color: "var(--warn)" }}>{a.inconformities}</b>
                  </div>
                ))}
              </>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                className="btn"
                style={{ background: "var(--primary)" }}
                disabled={!filteredRuns.length || generating}
                onClick={handleGeneratePDF}
              >
                {generating && <span className="spinner" />}
                {generating ? "Gerando..." : "⬇ Gerar PDF"}
              </button>
              <button
                className="btn"
                style={{ background: "var(--accent-dark)" }}
                disabled={!filteredRuns.length}
                onClick={() => downloadCSV(filteredRuns, `checklists_${new Date().toISOString().slice(0, 10)}.csv`)}
              >
                ⬇ Exportar CSV
              </button>
            </div>

            <div className="section-label" style={{ marginTop: 18 }}>Últimas aplicações</div>
            {filteredRuns.slice(0, 20).map((r) => {
              const tpl = getTemplate(r.templateId);
              const d = r.finishedAt?.toDate ? r.finishedAt.toDate().toLocaleString("pt-BR") : "—";
              return (
                <div
                  className="hist-row"
                  key={r.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/historico/${r.id}`)}
                >
                  <div>
                    <div>{tpl?.name || r.templateId} · {r.unitId}</div>
                    <div className="hist-meta">{d}</div>
                  </div>
                  <b style={{ color: r.finalScore >= 90 ? "var(--ok)" : "var(--caution)" }}>{r.finalScore}</b>
                </div>
              );
            })}
            {!filteredRuns.length && (
              <p style={{ fontSize: 12.5, color: "var(--sub)" }}>Nenhuma aplicação neste período/checklist.</p>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </>
  );
}
