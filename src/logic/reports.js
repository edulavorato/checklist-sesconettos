// Agregações usadas no painel de gestão — tudo derivado da lista de
// aplicações de checklist já concluídas (ver `firebase/firestore.js`).

function toDate(ts) {
  return ts?.toDate ? ts.toDate() : null;
}

// Agrupa as aplicações por unidade.
export function groupByUnit(runs) {
  return runs.reduce((acc, run) => {
    const key = run.unitId || "sem-unidade";
    (acc[key] ||= []).push(run);
    return acc;
  }, {});
}

// Estatísticas agregadas de uma lista de aplicações (geral ou de uma unidade).
export function computeStats(runs) {
  const count = runs.length;
  const avgScore = count
    ? Math.round(runs.reduce((s, r) => s + (r.finalScore || 0), 0) / count)
    : 0;
  const totalInconformities = runs.reduce((s, r) => s + (r.inconformities || 0), 0);
  const lastRun = runs[0] || null;
  return { count, avgScore, totalInconformities, lastRun };
}

// Compara a média das aplicações mais recentes com a média das anteriores,
// para mostrar se a unidade está melhorando ou piorando (`runs` já vem
// ordenado do mais recente para o mais antigo).
export function computeTrend(runs, windowSize = 5) {
  if (runs.length < 2) return null;
  const recent = runs.slice(0, windowSize);
  const previous = runs.slice(windowSize, windowSize * 2);
  if (!previous.length) return null;
  const avg = (list) => list.reduce((s, r) => s + (r.finalScore || 0), 0) / list.length;
  const delta = Math.round(avg(recent) - avg(previous));
  return delta;
}

// Série (data, nota) para o gráfico — mais antigo primeiro.
export function toScoreSeries(runs, limit = 14) {
  return [...runs]
    .slice(0, limit)
    .reverse()
    .map((r) => ({
      date: toDate(r.finishedAt),
      score: r.finalScore || 0,
    }));
}

// Exporta a lista de aplicações como CSV (para abrir no Excel/Sheets).
export function toCSV(runs) {
  const header = ["Data", "Unidade", "Checklist", "Nota", "Inconformidades"];
  const rows = runs.map((r) => {
    const d = toDate(r.finishedAt);
    return [
      d ? d.toLocaleString("pt-BR") : "",
      r.unitId || "",
      r.templateId || "",
      r.finalScore ?? "",
      r.inconformities ?? "",
    ];
  });
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadCSV(runs, filename = "checklists.csv") {
  const csv = toCSV(runs);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
