// Visão geral da administração, mostrada na tela inicial (Início) de quem
// tem `role: "admin"` — resumida de propósito (só números por unidade).
// A análise minuciosa, por gerente e por aplicação, fica na aba Gestão.
//
// A unidade de cada aplicação é a que o gerente escolheu na tela de
// finalização do checklist (não a unidade fixa do perfil) — por isso o
// resumo aqui é montado a partir das próprias aplicações (`checklistRuns`),
// não de uma lista fixa de "gerentes cadastrados por unidade".

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllChecklistHistory } from "../firebase/firestore";
import { UNITS } from "../data/units";
import { groupByUnit, computeStats, computeUnitStatus, isToday, toDate } from "../logic/reports";

export default function AdminOverview() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const allRuns = await getAllChecklistHistory();
        setRuns(allRuns);
      } catch (err) {
        if (err.code === "permission-denied") {
          setErrorMsg(
            "Sem permissão para carregar os dados de todas as unidades. As regras do Firestore precisam ser republicadas no Console (Firestore Database → Regras → colar o arquivo firebase/firestore.rules mais recente → Publicar)."
          );
        } else {
          setErrorMsg("Não foi possível carregar a visão geral: " + (err.message || "erro desconhecido"));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reloadKey]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", color: "var(--sub)" }}>
        <span className="spinner" style={{ borderColor: "rgba(149,11,10,.2)", borderTopColor: "var(--primary)", width: 22, height: 22 }} />
        <p style={{ fontSize: 12.5, marginTop: 10 }}>Carregando visão geral...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="card" style={{ cursor: "default", textAlign: "center", padding: "24px 18px" }}>
        <div style={{ fontSize: 26, marginBottom: 8 }}>⚠️</div>
        <p style={{ fontSize: 13, color: "var(--warn)", marginBottom: 14 }}>{errorMsg}</p>
        <button className="btn outline" onClick={() => setReloadKey((k) => k + 1)}>
          Tentar de novo
        </button>
      </div>
    );
  }

  const byUnit = groupByUnit(runs);

  return (
    <>
      {UNITS.map((unit) => {
        const unitRuns = byUnit[unit] || [];
        const stats = computeStats(unitRuns);
        const status = computeUnitStatus(stats.lastRun);
        const closedToday = new Set(
          unitRuns.filter((r) => isToday(toDate(r.finishedAt))).map((r) => r.userId)
        ).size;

        return (
          <div className="card" key={unit} style={{ cursor: "default", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>{unit}</div>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  color: status.stale ? "var(--warn)" : "var(--ok)",
                  background: status.stale ? "var(--warn-bg)" : "var(--ok-bg)",
                }}
              >
                {status.label}
              </span>
            </div>
            {!unitRuns.length ? (
              <p style={{ fontSize: 12, color: "var(--sub)", margin: 0 }}>Nenhuma aplicação registrada ainda nesta unidade.</p>
            ) : (
              <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 800, color: closedToday > 0 ? "var(--ok)" : "var(--warn)" }}>
                    {closedToday}
                  </span>
                  <div style={{ fontSize: 10.5, color: "var(--sub)", textTransform: "uppercase", fontWeight: 700 }}>
                    fecharam hoje
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{stats.avgScore}%</span>
                  <div style={{ fontSize: 10.5, color: "var(--sub)", textTransform: "uppercase", fontWeight: 700 }}>
                    média recente
                  </div>
                </div>
                {status.lastDate && (
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                      {status.lastDate.toLocaleDateString("pt-BR")}
                    </span>
                    <div style={{ fontSize: 10.5, color: "var(--sub)", textTransform: "uppercase", fontWeight: 700 }}>
                      última aplicação
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button className="btn outline" style={{ marginTop: 10 }} onClick={() => navigate("/gestao")}>
        Ver análise detalhada na Gestão →
      </button>
    </>
  );
}
