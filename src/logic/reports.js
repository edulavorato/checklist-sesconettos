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

// Série (data, nota, inconformidades) para os gráficos — mais antigo primeiro.
export function toScoreSeries(runs, limit = 14) {
  return [...runs]
    .slice(0, limit)
    .reverse()
    .map((r) => ({
      date: toDate(r.finishedAt),
      score: r.finalScore || 0,
      inconformities: r.inconformities || 0,
    }));
}

// Filtra a lista de aplicações por checklist e por janela de tempo (em dias,
// a partir de hoje). `templateId` null/"all" = todos os checklists;
// `days` null = sem limite de data.
export function filterRuns(runs, { templateId, days } = {}) {
  let filtered = runs;
  if (templateId && templateId !== "all") {
    filtered = filtered.filter((r) => r.templateId === templateId);
  }
  if (days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((r) => {
      const d = toDate(r.finishedAt);
      return d && d.getTime() >= cutoff;
    });
  }
  return filtered;
}

// Ranking das áreas do checklist com mais inconformidades, somando todas as
// unidades/aplicações — usa `scoreChecklist` para recalcular o detalhe por
// área de cada aplicação (o Firestore só guarda a nota final agregada).
export function computeAreaInconformityRanking(runs, templates, scoreChecklist) {
  const totals = {};
  runs.forEach((run) => {
    const template = templates?.[run.templateId];
    if (!template) return;
    const { areaResults } = scoreChecklist(template, run.responses || {});
    areaResults.forEach((a) => {
      const key = `${run.templateId}::${a.areaId}`;
      if (!totals[key]) totals[key] = { areaName: a.areaName, templateId: run.templateId, inconformities: 0, total: 0 };
      totals[key].inconformities += a.total - a.ok;
      totals[key].total += a.total;
    });
  });
  return Object.values(totals)
    .filter((a) => a.inconformities > 0)
    .sort((a, b) => b.inconformities - a.inconformities);
}

// Situação de cada unidade a partir da última aplicação concluída — sinaliza
// "atrasada" quando faz mais de `staleHours` que a unidade não fecha o
// checklist (fechamento é diário, então um dia e meio de folga já cobre
// atrasos normais sem gerar alarme falso).
export function computeUnitStatus(lastRun, staleHours = 36) {
  const d = toDate(lastRun?.finishedAt);
  if (!d) return { label: "Sem aplicações", stale: true, lastDate: null };
  const hoursSince = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  return {
    label: hoursSince > staleHours ? "Atrasada" : "Em dia",
    stale: hoursSince > staleHours,
    lastDate: d,
  };
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
