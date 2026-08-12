// Agregações usadas no painel de gestão — tudo derivado da lista de
// aplicações de checklist já concluídas (ver `firebase/firestore.js`).

export function toDate(ts) {
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

// Agrupa uma lista de perfis (`users/{uid}`) pela unidade cadastrada —
// usada na visão geral da administração (Início do admin).
export function groupUsersByUnit(users) {
  return users.reduce((acc, u) => {
    const key = u.unitId || "sem-unidade";
    (acc[key] ||= []).push(u);
    return acc;
  }, {});
}

// Aplicação mais recente de um usuário específico dentro de uma lista de
// `runs` já ordenada do mais recente para o mais antigo (como vem de
// `getAllChecklistHistory`/`getChecklistHistory`).
export function latestRunForUser(runs, uid) {
  return runs.find((r) => r.userId === uid) || null;
}

// Se uma data cai no dia de hoje (hora local do navegador).
export function isToday(date) {
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
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

// Filtra a lista de aplicações por checklist, janela de tempo, unidade e
// responsável (quem assinou a conclusão). `templateId`/`unitId`/`responsavel`
// null ou "all" = sem filtro nessa dimensão; `days` null = sem limite de data.
export function filterRuns(runs, { templateId, days, unitId, responsavel } = {}) {
  let filtered = runs;
  if (templateId && templateId !== "all") {
    filtered = filtered.filter((r) => r.templateId === templateId);
  }
  if (unitId && unitId !== "all") {
    filtered = filtered.filter((r) => r.unitId === unitId);
  }
  if (responsavel && responsavel !== "all") {
    filtered = filtered.filter((r) => (r.signedBy || "Não identificado") === responsavel);
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

// Lista de responsáveis distintos que já assinaram alguma aplicação —
// usada para popular o filtro "Responsável" no painel de gestão. Não
// depende de buscar a coleção `users`: usa o nome digitado na assinatura,
// que já fica salvo em cada `checklistRun` (`signedBy`).
export function getDistinctResponsibles(runs) {
  const names = new Set(runs.map((r) => r.signedBy || "Não identificado"));
  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Separa os itens (tipo "bool") de uma aplicação já concluída em duas
// listas — conformidades e inconformidades — respeitando `invertScoring`.
// Usado pelo pop-up de detalhamento (DetailModal) para mostrar pergunta,
// resposta, texto explicativo e se há foto anexada.
export function classifyRunItems(template, run) {
  const responses = run?.responses || {};
  const conformidades = [];
  const inconformidades = [];
  (template?.areas || []).forEach((area) => {
    area.items.forEach((item) => {
      if (item.type !== "bool") return;
      const response = responses[item.id];
      if (!response || response.answer === undefined) return;
      const goodAnswer = item.invertScoring ? false : true;
      const entry = {
        itemId: item.id,
        question: item.question,
        areaId: area.id,
        areaName: area.name,
        answer: response.answer,
        text: response.text || null,
        hasPhoto: !!item.requiresPhoto,
      };
      if (response.answer === goodAnswer) conformidades.push(entry);
      else inconformidades.push(entry);
    });
  });
  return { conformidades, inconformidades };
}

// Estatísticas por item (não só por área), somando todas as aplicações
// filtradas — mais granular que `computeAreaInconformityRanking`, pra
// apontar exatamente qual pergunta falha (ou acerta) mais, não só qual
// área. Devolve TODOS os itens respondidos, mesmo os com 0 inconformidade
// — quem consome decide se quer ranquear pelos piores ou pelos melhores.
export function computeItemStats(runs, templates) {
  const totals = {};
  runs.forEach((run) => {
    const template = templates?.[run.templateId];
    if (!template) return;
    const { inconformidades } = classifyRunItems(template, run);
    const responses = run.responses || {};
    template.areas.forEach((area) => {
      area.items.forEach((item) => {
        if (item.type !== "bool") return;
        const response = responses[item.id];
        if (!response || response.answer === undefined) return;
        const key = `${run.templateId}::${item.id}`;
        if (!totals[key]) {
          totals[key] = {
            itemId: item.id,
            question: item.question,
            areaId: area.id,
            areaName: area.name,
            templateId: run.templateId,
            inconformities: 0,
            total: 0,
          };
        }
        totals[key].total += 1;
      });
    });
    inconformidades.forEach((entry) => {
      const key = `${run.templateId}::${entry.itemId}`;
      if (totals[key]) totals[key].inconformities += 1;
    });
  });
  return Object.values(totals).map((t) => ({
    ...t,
    pct: t.total > 0 ? Math.round(((t.total - t.inconformities) / t.total) * 100) : 100,
  }));
}

// Todas as ocorrências de um item (ou de todos os itens de uma área, se
// `itemId` não for informado) dentro da lista de `runs` filtrada — usado
// pelo pop-up quando se clica num item do ranking de inconformidades ou
// numa área inteira, pra mostrar em quais unidades/datas/responsáveis
// aquele(s) problema(s) apareceram. `onlyInconformities = false` também
// traz as vezes em que o item passou.
export function getOccurrences(runs, templates, { templateId, areaId, itemId, onlyInconformities = true }) {
  const template = templates?.[templateId];
  if (!template) return [];
  const area = template.areas.find((a) => a.id === areaId);
  if (!area) return [];
  const items = itemId ? area.items.filter((i) => i.id === itemId) : area.items.filter((i) => i.type === "bool");

  const occurrences = [];
  runs.forEach((run) => {
    if (run.templateId !== templateId) return;
    items.forEach((item) => {
      const response = (run.responses || {})[item.id];
      if (!response || response.answer === undefined) return;
      const goodAnswer = item.invertScoring ? false : true;
      const isConform = response.answer === goodAnswer;
      if (onlyInconformities && isConform) return;
      occurrences.push({
        runId: run.id,
        unitId: run.unitId,
        date: toDate(run.finishedAt),
        responsavel: run.signedBy || "Não identificado",
        question: item.question,
        answer: response.answer,
        text: response.text || null,
        isConform,
      });
    });
  });
  return occurrences.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
}

// Compara o desempenho dos responsáveis que assinaram as aplicações
// filtradas — pra identificar se a inconformidade é um padrão pontual de
// alguém específico ou algo geral da operação. Só faz sentido mostrar
// quando há mais de um responsável distinto no recorte atual.
export function computeResponsibleRanking(runs) {
  const byResponsible = runs.reduce((acc, run) => {
    const key = run.signedBy || "Não identificado";
    (acc[key] ||= []).push(run);
    return acc;
  }, {});
  return Object.entries(byResponsible)
    .map(([responsavel, list]) => ({ responsavel, ...computeStats(list) }))
    .sort((a, b) => a.avgScore - b.avgScore);
}

// Detecta unidades em sequência de piora — nota caindo nas últimas 3
// aplicações consecutivas (mais recente primeiro). Sinal mais sensível que
// a tendência geral (`computeTrend`, que compara médias de janelas de 5),
// pensado pra pegar um problema começando antes que vire uma média ruim.
export function computeDecliningUnits(byUnit, minRuns = 3) {
  const declining = [];
  Object.entries(byUnit).forEach(([unitId, runs]) => {
    if (runs.length < minRuns) return;
    const recent = runs.slice(0, minRuns);
    let isDeclining = true;
    for (let i = 0; i < recent.length - 1; i++) {
      if ((recent[i].finalScore || 0) >= (recent[i + 1].finalScore || 0)) {
        isDeclining = false;
        break;
      }
    }
    if (isDeclining) {
      declining.push({
        unitId,
        from: recent[recent.length - 1].finalScore,
        to: recent[0].finalScore,
      });
    }
  });
  return declining;
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
      if (!totals[key]) totals[key] = { areaId: a.areaId, areaName: a.areaName, templateId: run.templateId, inconformities: 0, total: 0 };
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
