// Painel de gestão: visão agregada de todas as unidades — pensado para
// quem supervisiona (não necessariamente quem preenche o checklist no dia
// a dia). Hoje qualquer usuário autenticado acessa; quando o modelo de
// permissões (gerente x administrador) for definido, essa tela deve virar
// restrita a administradores.

import { useEffect, useState } from "react";
import { getAllChecklistHistory } from "../firebase/firestore";
import { getTemplate } from "../data/checklistTemplates";
import { groupByUnit, computeStats, computeTrend, toScoreSeries, downloadCSV } from "../logic/reports";
import TrendChart from "../components/TrendChart";
import BottomNav from "../components/BottomNav";

export default function ManagementPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

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

  const overall = computeStats(runs);
  const trend = computeTrend(runs);
  const series = toScoreSeries(runs);
  const byUnit = groupByUnit(runs);
  const unitRows = Object.entries(byUnit).map(([unitId, unitRuns]) => ({
    unitId,
    ...computeStats(unitRuns),
  }));

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
                  <div style={{ fontWeight: 700 }}>{u.unitId}</div>
                  <div className="hist-meta">{u.count} aplicação(ões) · {u.totalInconformities} inconform.</div>
                </div>
                <b style={{ color: u.avgScore >= 90 ? "var(--ok)" : "var(--caution)" }}>{u.avgScore}%</b>
              </div>
            ))}
            {!unitRows.length && <p style={{ fontSize: 12.5, color: "var(--sub)" }}>Nenhuma aplicação concluída ainda.</p>}

            <button
              className="btn"
              style={{ marginTop: 16, background: "var(--accent-dark)" }}
              disabled={!runs.length}
              onClick={() => downloadCSV(runs, `checklists_${new Date().toISOString().slice(0, 10)}.csv`)}
            >
              ⬇ Exportar CSV
            </button>

            <div className="section-label" style={{ marginTop: 18 }}>Últimas aplicações</div>
            {runs.slice(0, 20).map((r) => {
              const tpl = getTemplate(r.templateId);
              const d = r.finishedAt?.toDate ? r.finishedAt.toDate().toLocaleString("pt-BR") : "—";
              return (
                <div className="hist-row" key={r.id}>
                  <div>
                    <div>{tpl?.name || r.templateId} · {r.unitId}</div>
                    <div className="hist-meta">{d}</div>
                  </div>
                  <b style={{ color: r.finalScore >= 90 ? "var(--ok)" : "var(--caution)" }}>{r.finalScore}</b>
                </div>
              );
            })}
          </>
        )}
      </div>
      <BottomNav />
    </>
  );
}
