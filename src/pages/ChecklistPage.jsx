import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTemplate } from "../data/checklistTemplates";
import { useChecklistRun } from "../hooks/useChecklistRun";
import { useAuth } from "../context/AuthContext";
import ItemCard from "../components/ItemCard";
import ProgressBar from "../components/ProgressBar";
import {
  createChecklistRun,
  finishChecklistRun,
} from "../firebase/firestore";
import { uploadItemPhoto } from "../firebase/storage";

export default function ChecklistPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const template = getTemplate(templateId);
  const run = useChecklistRun(template);
  const [runId, setRunId] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!template) return <p>Checklist não encontrado.</p>;

  async function ensureRun() {
    if (runId) return runId;
    const id = await createChecklistRun({
      templateId: template.id,
      unitId: user?.unitId || "unidade-demo",
      userId: user?.uid,
    });
    setRunId(id);
    return id;
  }

  async function handlePhoto(itemId, file) {
    setUploading(true);
    try {
      const id = await ensureRun();
      const url = await uploadItemPhoto(id, itemId, file);
      run.answerItem(itemId, { photoUrl: url, photoPreview: URL.createObjectURL(file) });
    } finally {
      setUploading(false);
    }
  }

  async function handleFinish() {
    const id = await ensureRun();
    const result = run.getResult();
    await finishChecklistRun(id, {
      responses: run.responses,
      finalScore: result.finalScore,
      inconformities: result.inconformities,
    });
    navigate(`/checklist/${templateId}/resumo`, { state: { result } });
  }

  function handleNext() {
    const wasLast = run.isLastArea;
    const advanced = run.nextArea();
    if (advanced && wasLast) handleFinish();
  }

  return (
    <>
      <div className="topbar brand">
        <div className="topbar-title">{template.name}</div>
        <div className="topbar-sub">
          Área {run.areaIndex + 1} de {template.areas.length} · {run.currentArea.name}
        </div>
        <ProgressBar current={run.areaIndex + 1} total={template.areas.length} />
      </div>
      <div className="content">
        {run.currentArea.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            response={run.responses[item.id]}
            onAnswer={(patch) => run.answerItem(item.id, patch)}
            onPhoto={(file) => handlePhoto(item.id, file)}
          />
        ))}
      </div>
      <div className="bottomnav">
        <button className="navbtn" disabled={run.areaIndex === 0} onClick={run.prevArea}>
          ← Voltar
        </button>
        <button
          className="navbtn primary"
          style={{ flex: 2 }}
          disabled={!run.canAdvance || uploading}
          onClick={handleNext}
        >
          {uploading ? "Enviando foto..." : run.isLastArea ? "Concluir checklist" : "Próxima área →"}
        </button>
      </div>
    </>
  );
}
