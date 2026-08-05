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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [allUsers, allRuns] = await Promise.all([getAllUsers(), getAllChecklistHistory()]);
        setUsers(allUsers.filter((u) => u.role !== "admin"));
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

  if (!users.length) {
    return (
      <div className="empty-hint">
        <span style={{ fontSize: 22 }}>🏬</span>
        Nenhum gerente cadastrado ainda. Assim que alguém completar o Perfil, aparece aqui.
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
