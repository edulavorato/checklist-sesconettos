// Estado de uma aplicação de checklist em andamento: área atual, respostas
// acumuladas, navegação entre áreas. É o "cérebro" da tela de Checklist.

import { useState, useMemo } from "react";
import { isAreaComplete } from "../logic/validation";
import { scoreChecklist } from "../logic/scoring";

export function useChecklistRun(template) {
  const [areaIndex, setAreaIndex] = useState(0);
  const [responses, setResponses] = useState({});

  const currentArea = template.areas[areaIndex];
  const isLastArea = areaIndex === template.areas.length - 1;
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
