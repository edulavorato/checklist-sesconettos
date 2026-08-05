// Regras de pontuação do checklist.
// Isolado do resto do app para ser fácil de testar e ajustar sem mexer em telas.

/**
 * Calcula o resultado de uma área a partir das respostas.
 * @param {object} area - definição da área (vinda do template)
 * @param {object} responses - respostas indexadas por itemId: { [itemId]: { answer, photoUrl, gps, text } }
 * @returns {{ ok: number, total: number, pct: number }}
 */
export function scoreArea(area, responses) {
  const scored = area.items.filter((item) => item.type === "bool");
  const total = scored.length;
  const ok = scored.filter((item) => responses[item.id]?.answer === true).length;
  const pct = total === 0 ? 100 : Math.round((ok / total) * 100);
  return { ok, total, pct };
}

/**
 * Calcula o resultado geral do checklist (todas as áreas).
 * @param {object} template - checklist completo (com `areas`)
 * @param {object} responses - respostas indexadas por itemId
 */
export function scoreChecklist(template, responses) {
  const areaResults = template.areas.map((area) => ({
    areaId: area.id,
    areaName: area.name,
    ...scoreArea(area, responses),
  }));

  const totalItems = areaResults.reduce((sum, a) => sum + a.total, 0);
  const totalOk = areaResults.reduce((sum, a) => sum + a.ok, 0);
  const finalScore = totalItems === 0 ? 100 : Math.round((totalOk / totalItems) * 100);
  const inconformities = totalItems - totalOk;

  return { areaResults, finalScore, inconformities, totalItems, totalOk };
}
