// Visão geral da administração, mostrada na tela inicial (Início) de quem
// tem `role: "admin"` — como esse login não faz checklist, a tela inicial
// vira um resumo de cada gerente, separado por unidade: fechou hoje ou não,
// e a nota da última aplicação.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers } from "../firebase/profile";
import { getAllChecklistHistory } from "../firebase/firestore";
import { UNITS } from "../data/units";
import { groupUsersByUnit, latestRunForUser, isToday, toDate } from "../logic/reports";

export default function AdminOverview() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [allUsers, allRuns] = await Promise.all([getAllUsers(), getAllChecklistHistory()]);
        setUsers(allUsers.filter((u) => u.role !== "admin"));
        setRuns(allRuns);
      } catch (err) {
        setErrorMsg("Não foi possível carregar a visão geral: " + (err.message || "erro desconhecido"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p>Carregando...</p>;
  if (errorMsg) {
    return (
      <div style={{ background: "var(--warn-bg)", color: "var(--warn)", padding: "10px 12px", borderRadius: 8, fontSize: 13 }}>
        {errorMsg}
      </div>
    );
  }

  const byUnit = groupUsersByUnit(users);
  const semUnidade = users.filter((u) => !u.unitId);

  return (
    <>
      {UNITS.map((unit) => {
        const managers = byUnit[unit] || [];
        return (
          <div key={unit} style={{ marginBottom: 18 }}>
            <div className="section-label">{unit}</div>
            {!managers.length && (
              <p style={{ fontSize: 12, color: "var(--sub)" }}>Nenhum gerente cadastrado nesta unidade ainda.</p>
            )}
            {managers.map((m) => {
              const lastRun = latestRunForUser(runs, m.id);
              const lastDate = lastRun ? toDate(lastRun.finishedAt) : null;
              const closedToday = isToday(lastDate);
              return (
                <div
                  className="hist-row"
                  key={m.id}
                  style={{ cursor: lastRun ? "pointer" : "default" }}
                  onClick={() => lastRun && navigate(`/historico/${lastRun.id}`)}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {m.displayName || "(sem nome cadastrado)"}
                      {m.cargo ? ` · ${m.cargo}` : ""}
                    </div>
                    <div className="hist-meta">
                      {lastDate
                        ? `Última aplicação: ${lastDate.toLocaleDateString("pt-BR")} · nota ${lastRun.finalScore ?? "—"}%`
                        : "Nenhuma aplicação ainda"}
                      {lastRun?.unitId && lastRun.unitId !== unit ? ` (em ${lastRun.unitId})` : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                      color: closedToday ? "var(--ok)" : "var(--warn)",
                      background: closedToday ? "var(--ok-bg)" : "var(--warn-bg)",
                    }}
                  >
                    {closedToday ? "Fechou hoje" : "Pendente hoje"}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      {semUnidade.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div className="section-label">Sem unidade definida</div>
          {semUnidade.map((m) => (
            <div className="hist-row" key={m.id}>
              <div style={{ fontWeight: 700 }}>{m.displayName || "(sem nome cadastrado)"}</div>
              <span style={{ fontSize: 11, color: "var(--sub)" }}>Perfil incompleto</span>
            </div>
          ))}
        </div>
      )}

      {!users.length && (
        <p style={{ fontSize: 12.5, color: "var(--sub)" }}>Nenhum gerente cadastrado ainda.</p>
      )}
    </>
  );
}
