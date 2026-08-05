import { useEffect, useRef, useState } from "react";
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
import { getCurrentLocation } from "../logic/geo";
import { UNITS } from "../data/units";

export default function ChecklistPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const template = getTemplate(templateId);
  const run = useChecklistRun(template);
  const [runId, setRunId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [finishUnitId, setFinishUnitId] = useState("");
  const startedAtRef = useRef(null);
  const startLocationRef = useRef(null);

  // Pede a localização assim que a tela abre (em segundo plano), para já
  // ter o "início da aplicação" pronto quando o primeiro registro acontecer.
  useEffect(() => {
    getCurrentLocation().then((loc) => {
      startLocationRef.current = loc;
    });
  }, []);

  // A unidade da aplicação começa como a unidade do perfil, mas o campo na
  // tela de finalização permite trocar (gerente cobrindo outra unidade).
  useEffect(() => {
    if (profile?.unitId && !finishUnitId) setFinishUnitId(profile.unitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!template) return <p>Checklist não encontrado.</p>;

  const effectiveUnitId = finishUnitId || profile?.unitId || UNITS[0];

  async function ensureRun() {
    if (runId) return runId;
    startedAtRef.current = new Date();
    const id = await createChecklistRun({
      templateId: template.id,
      unitId: effectiveUnitId,
      userId: user?.uid,
      startLocation: startLocationRef.current,
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
      const endLocation = await getCurrentLocation();
      const finishedAt = new Date();
      await finishChecklistRun(id, {
        responses: run.responses,
        finalScore: result.finalScore,
        inconformities: result.inconformities,
        endLocation,
      });
      navigate(`/checklist/${templateId}/resumo`, {
        state: {
          result,
          runId: id,
          responses: run.responses,
          unitId: effectiveUnitId,
          startedAt: startedAtRef.current,
          finishedAt,
          startLocation: startLocationRef.current,
          endLocation,
        },
      });
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

        {run.isLastArea && (
          <div className="card" style={{ cursor: "default", marginTop: 4 }}>
            <label className="flabel">Unidade desta aplicação</label>
            <select
              className="finput"
              style={{ margin: 0 }}
              value={finishUnitId}
              onChange={(e) => setFinishUnitId(e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "var(--sub)", marginTop: 6, marginBottom: 0 }}>
              Já vem preenchido com a sua unidade — só troque se estiver fechando em outra unidade hoje.
            </p>
          </div>
        )}
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
