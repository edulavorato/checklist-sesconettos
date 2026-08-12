// Modelo de dados dos checklists disponíveis.
// Em produção isso vem do Firestore (coleção `checklistTemplates`);
// por enquanto fica hardcoded aqui para o desenvolvimento inicial.

export const CHECKLIST_TEMPLATES = {
  fechamento: {
    id: "fechamento",
    name: "Fechamento",
    schedule: "Todos os dias · 20h–2h",
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

  // Checklist de Abertura — mesma estrutura de áreas/itens do relatório que
  // já era gerado no ChecklistFácil (31 itens em 8 áreas), pra manter a
  // equipe respondendo exatamente as mesmas perguntas de antes.
  abertura: {
    id: "abertura",
    name: "Abertura",
    schedule: "Todos os dias · 15h30–19h30",
    areas: [
      {
        id: "limpeza",
        name: "Limpeza e Organização",
        items: [
          { id: "salao-limpo", question: "Salão limpo?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "banheiro-limpo", question: "Banheiro limpo?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "lixeiras-limpas", question: "Lixeiras limpas?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "piso-limpo", question: "Piso limpo?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "uniforme-limpo", question: "Uniforme limpo?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "uniforme-completo", question: "Uniforme completo?", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "producao",
        name: "Produção",
        items: [
          { id: "massa-padrao", question: "Massa no padrão?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "molhos-conferidos", question: "Molhos conferidos?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "insumos-fracionados", question: "Insumos fracionados?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "validade-conferida", question: "Validade conferida?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "producao-suficiente", question: "Produção suficiente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "equipamentos",
        name: "Equipamentos",
        items: [
          { id: "geladeira-funcionando", question: "Geladeira funcionando normalmente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "freezers-funcionando", question: "Freezers funcionando normalmente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "lava-loucas-funcionando", question: "Máquinas de lavar louça funcionando normalmente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "maquina-gelo-funcionando", question: "Máquina de gelo funcionando normalmente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "equipamento-manutencao", question: "Tem algum equipamento precisando de manutenção?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "camara-fria-funcionando", question: "Câmara fria funcionando normalmente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "computadores-sistemas",
        name: "Computadores e Sistemas",
        items: [
          { id: "computadores-funcionando", question: "Computadores funcionando normalmente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "celular-funcionando", question: "Celular funcionando normalmente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "sistema-saipos-funcionando", question: "Sistema SAIPOS funcionando normalmente?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "impressoras-termicas", question: "Impressoras térmicas funcionando?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "internet-funcionando", question: "Internet funcionando?", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "equipe",
        name: "Equipe",
        items: [
          { id: "equipe-completa", question: "Equipe completa?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "mao-obra-extra", question: "Mão de obra extra identificada?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "reuniao-5min", question: "Reunião de 5 minutos realizada? Qual a pauta?", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "reservas",
        name: "Reservas",
        items: [
          { id: "sistema-tagme", question: "Sistema da TagMe para reservas conferido?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "temos-reservas", question: "Temos reservas?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "mesas-montadas", question: "As mesas foram montadas?", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "atendimento-cliente",
        name: "Atendimento ao Cliente",
        items: [
          { id: "conversas-whatsapp", question: "Conferiu as conversas com os clientes via WhatsApp?", type: "bool", weight: 1, required: true, requiresPhoto: true },
          { id: "problema-identificado", question: "Algum problema identificado?", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
      {
        id: "ocorrencias-atipicas",
        name: "Ocorrência de Situações Atípicas",
        items: [
          { id: "situacao-atipica", question: "Ocorreu alguma situação atípica que precisa ser relatada?", type: "bool", weight: 1, required: true, requiresPhoto: true },
        ],
      },
    ],
  },
};

export function getTemplate(id) {
  return CHECKLIST_TEMPLATES[id] || null;
}
