// Visão geral da administração, mostrada na tela inicial (Início) de quem
// tem `role: "admin"` — resumida de propósito (só números por unidade).
// A análise minuciosa, por gerente e por aplicação, fica na aba Gestão.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers } from "../firebase/profile";
import { getAllChecklistHistory } from "../firebase/firestore";
import { UNITS } from "../data/units";
import { groupUsersByUnit, latestRunForUser, isToday } from "../logic/reports";

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
  const semUnidade = users.filter((u) => !u.unitId).length;

  return (
    <>
      {UNITS.map((unit) => {
        const managers = byUnit[unit] || [];
        const withRun = managers
          .map((m) => latestRunForUser(runs, m.id))
          .filter(Boolean);
        const closedToday = withRun.filter((r) => isToday(r.finishedAt?.toDate ? r.finishedAt.toDate() : null)).length;
        const avgScore = withRun.length
          ? Math.round(withRun.reduce((s, r) => s + (r.finalScore || 0), 0) / withRun.length)
          : null;

        return (
          <div className="card" key={unit} style={{ cursor: "default", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 8 }}>{unit}</div>
            {!managers.length ? (
              <p style={{ fontSize: 12, color: "var(--sub)", margin: 0 }}>Nenhum gerente cadastrado nesta unidade ainda.</p>
            ) : (
              <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
                <div>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: closedToday === managers.length ? "var(--ok)" : "var(--warn)",
                    }}
                  >
                    {closedToday}/{managers.length}
                  </span>
                  <div style={{ fontSize: 10.5, color: "var(--sub)", textTransform: "uppercase", fontWeight: 700 }}>
                    fecharam hoje
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
                    {avgScore !== null ? `${avgScore}%` : "—"}
                  </span>
                  <div style={{ fontSize: 10.5, color: "var(--sub)", textTransform: "uppercase", fontWeight: 700 }}>
                    média recente
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {semUnidade > 0 && (
        <p style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 4 }}>
          {semUnidade} gerente(s) ainda sem unidade definida no perfil.
        </p>
      )}

      <button className="btn outline" style={{ marginTop: 10 }} onClick={() => navigate("/gestao")}>
        Ver análise detalhada na Gestão →
      </button>
    </>
  );
}
