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
import { savePhotoForItem } from "../firebase/photos";

export default function ChecklistPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const template = getTemplate(templateId);
  const run = useChecklistRun(template);
  const [runId, setRunId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

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
    setErrorMsg(null);
    try {
      const id = await ensureRun();
      const dataUrl = await savePhotoForItem(id, itemId, file);
      run.answerItem(itemId, { photoUrl: dataUrl, photoPreview: dataUrl });
    } catch (err) {
      setErrorMsg("Não foi possível enviar a foto: " + (err.message || "erro desconhecido"));
    } finally {
      setUploading(false);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setErrorMsg(null);
    try {
      const id = await ensureRun();
      const result = run.getResult();
      await finishChecklistRun(id, {
        responses: run.responses,
        finalScore: result.finalScore,
        inconformities: result.inconformities,
      });
      navigate(`/checklist/${templateId}/resumo`, { state: { result } });
    } catch (err) {
      setErrorMsg("Não foi possível concluir o checklist: " + (err.message || "erro desconhecido"));
    } finally {
      setFinishing(false);
    }
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
        {errorMsg && (
          <div style={{ background: "#fff0f0", color: "#b3261e", padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}
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
          disabled={!run.canAdvance || uploading || finishing}
          onClick={handleNext}
        >
          {(uploading || finishing) && <span className="spinner" style={{ borderColor: "rgba(67,56,202,.25)", borderTopColor: "var(--primary)" }} />}
          {uploading ? "Enviando foto..." : finishing ? "Concluindo..." : run.isLastArea ? "Concluir checklist" : "Próxima área →"}
        </button>
      </div>
    </>
  );
}
