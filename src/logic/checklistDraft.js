// Salva o progresso de um checklist em andamento no localStorage do
// aparelho, pra sobreviver a fechar o app, recarregar a página, perder a
// conexão ou o navegador travar no meio do preenchimento — cenário comum
// numa cozinha corrida, com o celular sendo usado com uma mão só.
//
// Sem isso, o checklist inteiro (até 31 itens) só existia na memória do
// React e se perdia por completo em qualquer um desses casos, obrigando a
// pessoa a recomeçar do zero.

const PREFIX = "checklist-draft:";

// Rascunhos mais velhos que isso são ignorados (e apagados) — cobre uma
// folga generosa de um turno de trabalho sem arriscar retomar, dias
// depois, um checklist de um turno completamente diferente.
const MAX_AGE_HOURS = 20;

export function loadDraft(templateId) {
  if (typeof window === "undefined" || !templateId) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + templateId);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    const savedAt = draft?.savedAt ? new Date(draft.savedAt).getTime() : 0;
    if (!savedAt || Date.now() - savedAt > MAX_AGE_HOURS * 60 * 60 * 1000) {
      window.localStorage.removeItem(PREFIX + templateId);
      return null;
    }
    return draft;
  } catch {
    // localStorage indisponível (modo privado, cota cheia, navegador
    // antigo) — segue sem autosave, o checklist continua funcionando
    // normalmente, só sem a rede de segurança.
    return null;
  }
}

export function saveDraft(templateId, draft) {
  if (typeof window === "undefined" || !templateId) return;
  try {
    window.localStorage.setItem(
      PREFIX + templateId,
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() })
    );
  } catch {
    // Sem espaço ou sem acesso ao localStorage — ignora silenciosamente.
  }
}

export function clearDraft(templateId) {
  if (typeof window === "undefined" || !templateId) return;
  try {
    window.localStorage.removeItem(PREFIX + templateId);
  } catch {
    // ignora
  }
}
