// Painel de gestão: visão agregada de todas as unidades — pensado para
// quem supervisiona (não necessariamente quem preenche o checklist no dia
// a dia). Restrito a administradores (ver RequireAdmin/AppRoutes).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllChecklistHistory } from "../firebase/firestore";
import { getTemplate, CHECKLIST_TEMPLATES } from "../data/checklistTemplates";
import { UNITS } from "../data/units";
import { scoreChecklist } from "../logic/scoring";
import {
  groupByUnit,
  computeStats,
  computeTrend,
  toScoreSeries,
  downloadCSV,
  filterRuns,
  computeAreaInconformityRanking,
  computeItemStats,
  computeUnitStatus,
  computeResponsibleRanking,
  computeDecliningUnits,
  getDistinctResponsibles,
  getOccurrences,
} from "../logic/reports";
import { generateManagementPDF } from "../logic/pdfReport";
import TrendChart from "../components/TrendChart";
import BottomNav from "../components/BottomNav";
import DetailModal from "../components/DetailModal";

const PERIOD_OPTIONS = [
  { value: "", label: "Todo o período" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

const FOCUS_OPTIONS = [
  { value: "inconformidades", label: "Foco: Inconformidades" },
  { value: "conformidades", label: "Foco: Conformidades" },
];

export default function ManagementPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [focusFilter, setFocusFilter] = useState("inconformidades");
  const [detail, setDetail] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    unitId: unitFilter,
    responsavel: responsavelFilter,
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

  const itemStatsAll = computeItemStats(filteredRuns, CHECKLIST_TEMPLATES);
  const itemRanking =
    focusFilter === "conformidades"
      ? [...itemStatsAll].filter((t) => t.total > 0).sort((a, b) => b.pct - a.pct).slice(0, 8)
      : [...itemStatsAll].filter((t) => t.inconformities > 0).sort((a, b) => b.inconformities - a.inconformities).slice(0, 8);

  const responsibleRanking = computeResponsibleRanking(filteredRuns);
  const decliningUnits = computeDecliningUnits(byUnit);
  const responsibleOptions = getDistinctResponsibles(runs);
  const extraFiltersCount =
    (unitFilter !== "all" ? 1 : 0) + (responsavelFilter !== "all" ? 1 : 0) + (focusFilter !== "inconformidades" ? 1 : 0);

  const unitsWithData = unitRows.filter((u) => u.count > 0);
  const highlightUnit =
    unitsWithData.length > 1
      ? {
          best: [...unitsWithData].sort((a, b) => b.avgScore - a.avgScore)[0],
          worst: [...unitsWithData].sort((a, b) => a.avgScore - b.avgScore)[0],
        }
      : null;

  function openRunDetail(run) {
    const template = getTemplate(run.templateId);
    if (!template) return;
    setDetail({ mode: "run", run, template });
  }

  function openAreaDetail(area) {
    const occurrences = getOccurrences(filteredRuns, CHECKLIST_TEMPLATES, {
      templateId: area.templateId,
      areaId: area.areaId,
      onlyInconformities: focusFilter !== "conformidades",
    });
    setDetail({
      mode: "occurrences",
      title: area.areaName,
      subtitle: `${getTemplate(area.templateId)?.name || area.templateId} · ${occurrences.length} ocorrência(s) no filtro atual`,
      occurrences,
    });
  }

  function openItemDetail(item) {
    const occurrences = getOccurrences(filteredRuns, CHECKLIST_TEMPLATES, {
      templateId: item.templateId,
      areaId: item.areaId,
      itemId: item.itemId,
      onlyInconformities: focusFilter !== "conformidades",
    });
    setDetail({
      mode: "occurrences",
      title: item.question,
      subtitle: `${item.areaName} · ${getTemplate(item.templateId)?.name || item.templateId}`,
      occurrences,
    });
  }

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
            <div className="filter-row">
              <div className="filter-field">
                <label className="flabel">Checklist</label>
                <select className="finput" value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)}>
                  <option value="all">Todos os checklists</option>
                  {Object.values(CHECKLIST_TEMPLATES).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="filter-field">
                <label className="flabel">Período</label>
                <select className="finput" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                  {PERIOD_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="filters-toggle" onClick={() => setFiltersOpen((v) => !v)}>
              <span>
                ⚙ Mais filtros
                {extraFiltersCount > 0 && <span className="badge-count">{extraFiltersCount}</span>}
              </span>
              <span className={`filters-chevron ${filtersOpen ? "open" : ""}`}>▾</span>
            </button>

            {filtersOpen && (
              <div className="filters-panel">
                <div className="filter-field">
                  <label className="flabel">Unidade</label>
                  <select className="finput" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                    <option value="all">Todas as unidades</option>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-field">
                  <label className="flabel">Responsável</label>
                  <select className="finput" value={responsavelFilter} onChange={(e) => setResponsavelFilter(e.target.value)}>
                    <option value="all">Todos os responsáveis</option>
                    {responsibleOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-field" style={{ marginBottom: extraFiltersCount > 0 ? 4 : 0 }}>
                  <label className="flabel">Foco da análise</label>
                  <select className="finput" value={focusFilter} onChange={(e) => setFocusFilter(e.target.value)} style={{ marginBottom: 0 }}>
                    {FOCUS_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                {extraFiltersCount > 0 && (
                  <button
                    className="filters-clear"
                    onClick={() => {
                      setUnitFilter("all");
                      setResponsavelFilter("all");
                      setFocusFilter("inconformidades");
                    }}
                  >
                    Limpar estes filtros
                  </button>
                )}
              </div>
            )}

            <div className="kpi-row">
              <div className="kpi">
                <div className="kpi-num">{overall.avgScore}%</div>
                <div className="kpi-label">MÉDIA GERAL</div>
                <div className="kpi-hint">Nota média de todas as aplicações no filtro atual</div>
              </div>
              <div className="kpi">
                <div className="kpi-num">{overall.totalInconformities}</div>
                <div className="kpi-label">INCONFORM.</div>
                <div className="kpi-hint">Itens marcados como "Não" (ou "Sim" nos itens invertidos) somando tudo</div>
              </div>
              <div className="kpi">
                <div className="kpi-num">{overall.count}</div>
                <div className="kpi-label">APLICAÇÕES</div>
                <div className="kpi-hint">Checklists concluídos dentro do filtro atual</div>
              </div>
            </div>

            {trend !== null && (
              <div style={{ fontSize: 12.5, color: trend >= 0 ? "var(--ok)" : "var(--warn)", fontWeight: 700, marginBottom: 4 }}>
                {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)} pontos vs. aplicações anteriores
              </div>
            )}
            {trend !== null && (
              <p className="section-hint" style={{ marginTop: 0, marginBottom: 14 }}>
                Compara a média das últimas 5 aplicações com as 5 anteriores a elas — mostra se a rede está melhorando ou piorando.
              </p>
            )}

            {decliningUnits.length > 0 && (
              <div style={{ background: "var(--warn-bg)", color: "var(--warn)", padding: "10px 12px", borderRadius: 10, marginBottom: 14, fontSize: 12.5 }}>
                <b>⚠ Atenção:</b> {decliningUnits.map((d) => d.unitId).join(", ")} {decliningUnits.length === 1 ? "está" : "estão"} em queda de nota nas últimas 3 aplicações seguidas
                {decliningUnits.length === 1 && ` (de ${decliningUnits[0].from}% para ${decliningUnits[0].to}%)`}.
              </div>
            )}

            {unitRows.length > 1 && highlightUnit && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {highlightUnit.best && (
                  <div className="card" style={{ cursor: "default", flex: 1, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: "var(--ok)", textTransform: "uppercase", letterSpacing: ".3px" }}>
                      ✓ Melhor desempenho
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{highlightUnit.best.unitId}</div>
                    <div style={{ fontSize: 11, color: "var(--sub)" }}>{highlightUnit.best.avgScore}% de média</div>
                  </div>
                )}
                {highlightUnit.worst && highlightUnit.worst.unitId !== highlightUnit.best?.unitId && (
                  <div className="card" style={{ cursor: "default", flex: 1, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: "var(--warn)", textTransform: "uppercase", letterSpacing: ".3px" }}>
                      ⚠ Precisa de atenção
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{highlightUnit.worst.unitId}</div>
                    <div style={{ fontSize: 11, color: "var(--sub)" }}>{highlightUnit.worst.avgScore}% de média</div>
                  </div>
                )}
              </div>
            )}

            <div className="section-label">Evolução da nota</div>
            <p className="section-hint">Nota de cada aplicação ao longo do tempo, dentro do filtro atual (mais recente à direita).</p>
            <div className="card" style={{ cursor: "default", padding: 12 }}>
              <TrendChart series={series} />
            </div>

            <div className="section-label">Por unidade</div>
            <p className="section-hint">
              Desempenho de cada unidade no filtro atual. "Atrasada" indica que a unidade está há mais de 36h sem uma aplicação concluída.
            </p>
            {unitRows.map((u) => (
              <div className="card" key={u.unitId} style={{ cursor: "default", padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
                  <b style={{ color: u.avgScore >= 90 ? "var(--ok)" : "var(--caution)", fontSize: 16 }}>{u.avgScore}%</b>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.max(0, Math.min(100, u.avgScore))}%`,
                      background: u.avgScore >= 90 ? "var(--ok)" : u.avgScore >= 70 ? "var(--caution)" : "var(--warn)",
                    }}
                  />
                </div>
              </div>
            ))}
            {!unitRows.length && <p style={{ fontSize: 12.5, color: "var(--sub)" }}>Nenhuma aplicação concluída ainda.</p>}

            {responsibleRanking.length > 1 && (
              <>
                <div className="section-label" style={{ marginTop: 18 }}>Por responsável</div>
                <p className="section-hint">
                  Comparação entre quem assinou a conclusão das aplicações no filtro atual — um sinal de quem pode precisar de mais apoio, não uma régua punitiva. Toque num nome para filtrar só por ele.
                </p>
                <div className="card" style={{ cursor: "default", padding: "6px 14px" }}>
                  {responsibleRanking.map((r) => (
                    <div
                      className="leader-row"
                      key={r.responsavel}
                      style={{ cursor: "pointer" }}
                      onClick={() => setResponsavelFilter(responsavelFilter === r.responsavel ? "all" : r.responsavel)}
                    >
                      <div>
                        <div className="leader-name">{r.responsavel}</div>
                        <div className="leader-meta">{r.count} aplicação(ões) · {r.totalInconformities} inconform.</div>
                      </div>
                      <b style={{ color: r.avgScore >= 90 ? "var(--ok)" : "var(--caution)" }}>{r.avgScore}%</b>
                    </div>
                  ))}
                </div>
              </>
            )}

            {areaRanking.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 18 }}>Áreas com mais inconformidade</div>
                <p className="section-hint">
                  % de itens dessa área respondidos como problema (reprovados), somando todas as aplicações do filtro atual. Toque numa área para ver o detalhe de cada ocorrência.
                </p>
                {areaRanking.map((a) => {
                  const pct = a.total > 0 ? Math.round((a.inconformities / a.total) * 100) : 0;
                  return (
                    <div
                      key={`${a.templateId}::${a.areaName}`}
                      style={{ marginBottom: 10, cursor: "pointer" }}
                      onClick={() => openAreaDetail(a)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.areaName}</div>
                          <div className="hist-meta">{getTemplate(a.templateId)?.name || a.templateId}</div>
                        </div>
                        <b style={{ color: "var(--warn)", fontSize: 13.5 }}>
                          {pct}% <span style={{ fontWeight: 400, fontSize: 11, color: "var(--sub)" }}>({a.inconformities}/{a.total})</span>
                        </b>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%`, background: "var(--warn)" }} />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {itemRanking.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 18 }}>
                  {focusFilter === "conformidades" ? "Itens com melhor desempenho" : "Itens mais reincidentes"}
                </div>
                <p className="section-hint">
                  {focusFilter === "conformidades"
                    ? "As perguntas específicas com maior taxa de conformidade no filtro atual — o que está funcionando bem na operação."
                    : "As perguntas específicas que mais falham no filtro atual — mais preciso que o ranking por área pra saber exatamente onde focar o treinamento."}
                </p>
                {itemRanking.map((it) => {
                  const shown = focusFilter === "conformidades" ? it.pct : Math.round((it.inconformities / it.total) * 100);
                  return (
                    <div
                      key={`${it.templateId}::${it.itemId}`}
                      style={{ marginBottom: 10, cursor: "pointer" }}
                      onClick={() => openItemDetail(it)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{it.question}</div>
                          <div className="hist-meta">{it.areaName} · {getTemplate(it.templateId)?.name || it.templateId}</div>
                        </div>
                        <b style={{ color: focusFilter === "conformidades" ? "var(--ok)" : "var(--warn)", fontSize: 13.5 }}>
                          {shown}%
                        </b>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${shown}%`, background: focusFilter === "conformidades" ? "var(--ok)" : "var(--warn)" }}
                        />
                      </div>
                    </div>
                  );
                })}
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
            <p className="section-hint">As 20 aplicações mais recentes dentro do filtro atual. Toque em uma para ver conformidades e inconformidades.</p>
            {filteredRuns.slice(0, 20).map((r) => {
              const tpl = getTemplate(r.templateId);
              const d = r.finishedAt?.toDate ? r.finishedAt.toDate().toLocaleString("pt-BR") : "—";
              return (
                <div
                  className="hist-row"
                  key={r.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => openRunDetail(r)}
                >
                  <div>
                    <div>{tpl?.name || r.templateId} · {r.unitId}</div>
                    <div className="hist-meta">{d}{r.signedBy && ` · ${r.signedBy}`}</div>
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

      {detail && (
        <DetailModal
          {...detail}
          onClose={() => setDetail(null)}
          onOpenFullReport={(runId) => {
            setDetail(null);
            navigate(`/historico/${runId}`);
          }}
        />
      )}
    </>
  );
}
