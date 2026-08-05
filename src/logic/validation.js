// Regras de "posso avançar?" — separadas da pontuação porque uma coisa é
// validar preenchimento (bloqueia navegação), outra é calcular nota (resultado).

/**
 * Verifica se uma área está completa o suficiente para avançar.
 * Foto NÃO é obrigatória (decisão tomada no protótipo de demonstração) —
 * mas o campo continua disponível na tela para quem quiser anexar.
 */
export function isAreaComplete(area, responses) {
  return area.items.every((item) => {
    if (!item.required) return true;
    const r = responses[item.id];
    if (item.type === "text") return true; // texto livre é sempre opcional
    if (item.type === "currency") return r?.answer !== undefined;
    return r?.answer !== undefined;
  });
}

export function isChecklistComplete(template, responses) {
  return template.areas.every((area) => isAreaComplete(area, responses));
}
