// Estado de uma aplicação de checklist em andamento: área atual, respostas
// acumuladas, navegação entre áreas. É o "cérebro" da tela de Checklist.

import { useState, useMemo } from "react";
import { isAreaComplete } from "../logic/validation";
import { scoreChecklist } from "../logic/scoring";

// Garante que um índice de área vindo de um rascunho salvo ainda é válido
// pro template atual (ex: template mudou de tamanho entre uma versão e
// outra do app) — sem isso um rascunho velho poderia apontar pra uma área
// que não existe mais e quebrar a tela.
function clampAreaIndex(index, template) {
  const total = template?.areas?.length || 1;
  if (typeof index !== "number" || Number.isNaN(index)) return 0;
  return Math.min(Math.max(index, 0), total - 1);
}

export function useChecklistRun(template, initial) {
  // `initial` (opcional) vem de um rascunho salvo automaticamente no
  // aparelho (ver `logic/checklistDraft.js`) — permite retomar de onde
  // parou depois de fechar o app ou perder conexão no meio do checklist.
  const initialAreaIndex = clampAreaIndex(initial?.areaIndex, template);
  const [areaIndex, setAreaIndex] = useState(initialAreaIndex);
  const [responses, setResponses] = useState(initial?.responses || {});

  // `template` pode chegar null por uma fração de segundo (ou por um link
  // com id de checklist inválido/digitado errado) — sem essa proteção, o
  // acesso a `template.areas` quebrava a tela inteira em branco antes da
  // página conseguir mostrar a mensagem de "checklist não encontrado".
  const areas = template?.areas || [];
  const currentArea = areas[areaIndex] || { id: "vazio", name: "", items: [] };
  const isLastArea = areaIndex >= areas.length - 1;
  const canAdvance = useMemo(
    () => isAreaComplete(currentArea, responses),
    [currentArea, responses]
  );

  function answerItem(itemId, patch) {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), ...patch },
    }));
  }

  function nextArea() {
    if (!canAdvance) return false;
    if (!isLastArea) setAreaIndex((i) => i + 1);
    return true;
  }

  function prevArea() {
    if (areaIndex > 0) setAreaIndex((i) => i - 1);
  }

  function getResult() {
    return scoreChecklist(template, responses);
  }

  return {
    areaIndex,
    currentArea,
    isLastArea,
    canAdvance,
    responses,
    answerItem,
    nextArea,
    prevArea,
    getResult,
  };
}
