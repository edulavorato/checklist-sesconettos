// Modelo de dados dos checklists disponíveis.
// Em produção isso vem do Firestore (coleção `checklistTemplates`);
// por enquanto fica hardcoded aqui para o desenvolvimento inicial.

export const CHECKLIST_TEMPLATES = {
  fechamento: {
    id: "fechamento",
    name: "Fechamento",
    schedule: "Todos os dias · 20h–23h",
    areas: [
      {
        id: "limpeza",
        name: "Limpeza e Organização",
        items: [
          { id: "salao-limpo", question: "Salão limpo?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "cozinha-limpa", question: "Cozinha limpa?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "utensilios-guardados", question: "Utensílios guardados?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "forno-desligado", question: "Forno desligado?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "lixo-retirado", question: "Lixo retirado", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "estoque",
        name: "Estoque",
        items: [
          { id: "insumos-guardados", question: "Insumos guardados?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "camara-fria", question: "Câmara fria verificada?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "validades", question: "Validades conferidas?", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "caixa",
        name: "Caixa",
        items: [
          { id: "caixa-fechado", question: "Caixa fechado?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "conferencia-pdv", question: "Conferência PDV?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "diferenca-caixa", question: "Diferença encontrada?", type: "currency", weight: 0, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "equipe",
        name: "Equipe",
        items: [
          { id: "equipe-liberada", question: "Equipe liberada corretamente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "faltas-atrasos", question: "Faltas ou atrasos?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "gas-fechado", question: "Gás fechado?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "equipamentos-desligados", question: "Equipamentos desligados?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "ocorrencias", question: "Ocorrências atípicas hoje? Se sim, descreva.", type: "text", weight: 0, required: false, requiresPhoto: false },
        ],
      },
    ],
  },
};

export function getTemplate(id) {
  return CHECKLIST_TEMPLATES[id] || null;
}
