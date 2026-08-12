// Pop-up de detalhamento usado no Painel de Gestão. Tem dois modos:
//
// - mode="run": mostra as conformidades/inconformidades de UMA aplicação
//   específica (aberto ao clicar numa linha de "Últimas aplicações").
// - mode="occurrences": mostra todas as ocorrências de UM item específico
//   ao longo de várias aplicações filtradas (aberto ao clicar num item do
//   ranking "Áreas com mais inconformidade" / "Itens mais reincidentes").
//
// Em nenhum dos dois casos é preciso buscar dado novo no Firestore além do
// que o Painel de Gestão já carregou — no modo "run" só as fotos (que ficam
// numa subcoleção separada) são buscadas na hora de abrir o pop-up.

import { useEffect, useState } from "react";
import { classifyRunItems } from "../logic/reports";
import { getPhotosForRun } from "../firebase/photos";

export default function DetailModal({ mode, run, template, occurrences, title, subtitle, onClose, onOpenFullReport }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {mode === "run" ? (
          <RunDetail run={run} template={template} onClose={onClose} onOpenFullReport={onOpenFullReport} />
        ) : (
          <OccurrencesDetail
            title={title}
            subtitle={subtitle}
            occurrences={occurrences}
            onClose={onClose}
            onOpenFullReport={onOpenFullReport}
          />
        )}
      </div>
    </div>
  );
}

function RunDetail({ run, template, onClose, onOpenFullReport }) {
  const [photos, setPhotos] = useState({});
  const [tab, setTab] = useState(null);

  useEffect(() => {
    getPhotosForRun(run.id).then(setPhotos).catch(() => setPhotos({}));
  }, [run.id]);

  const { conformidades, inconformidades } = classifyRunItems(template, run);
  const activeTab = tab || (inconformidades.length ? "inconformidades" : "conformidades");
  const list = activeTab === "inconformidades" ? inconformidades : conformidades;
  const d = run.finishedAt?.toDate ? run.finishedAt.toDate().toLocaleString("pt-BR") : "—";

  return (
    <>
      <div className="modal-header">
        <div>
          <div className="modal-title">{template?.name || run.templateId} · {run.unitId}</div>
          <div className="modal-sub">{d} · {run.signedBy ? `assinado por ${run.signedBy}` : "sem assinatura registrada"}</div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === "inconformidades" ? "active warn" : ""}`}
            onClick={() => setTab("inconformidades")}
          >
            ⚠ Inconformidades ({inconformidades.length})
          </button>
          <button
            className={`modal-tab ${activeTab === "conformidades" ? "active ok" : ""}`}
            onClick={() => setTab("conformidades")}
          >
            ✓ Conformidades ({conformidades.length})
          </button>
        </div>
        {list.map((entry) => (
          <div className={`detail-item ${activeTab === "inconformidades" ? "warn" : "ok"}`} key={entry.itemId}>
            <div className="detail-item-q">{entry.question}</div>
            <div className="detail-item-meta">{entry.areaName} · resposta: {entry.answer ? "Sim" : "Não"}</div>
            {entry.text && <div className="detail-item-text">"{entry.text}"</div>}
            {entry.hasPhoto && (
              photos[entry.itemId]
                ? <img src={photos[entry.itemId]} alt="Evidência" style={{ width: "100%", borderRadius: 8, marginTop: 7 }} />
                : <div className="detail-item-photo">📷 sem foto anexada</div>
            )}
          </div>
        ))}
        {!list.length && <p style={{ fontSize: 12.5, color: "var(--sub)" }}>Nenhum item nessa categoria.</p>}
        {onOpenFullReport && (
          <button className="btn outline" style={{ marginTop: 10 }} onClick={() => onOpenFullReport(run.id)}>
            Ver relatório completo →
          </button>
        )}
      </div>
    </>
  );
}

function OccurrencesDetail({ title, subtitle, occurrences, onClose, onOpenFullReport }) {
  return (
    <>
      <div className="modal-header">
        <div>
          <div className="modal-title">{title}</div>
          <div className="modal-sub">{subtitle}</div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        {occurrences.map((o, i) => (
          <div
            className={`detail-item ${o.isConform ? "ok" : "warn"}`}
            key={`${o.runId}-${i}`}
            style={{ cursor: onOpenFullReport ? "pointer" : "default" }}
            onClick={() => onOpenFullReport && onOpenFullReport(o.runId)}
          >
            {o.question && <div className="detail-item-q">{o.question}</div>}
            <div className="detail-item-meta">
              {o.unitId} · {o.date ? o.date.toLocaleDateString("pt-BR") : "—"} · {o.responsavel} · resposta: {o.answer ? "Sim" : "Não"}
            </div>
            {o.text && <div className="detail-item-text">"{o.text}"</div>}
          </div>
        ))}
        {!occurrences.length && <p style={{ fontSize: 12.5, color: "var(--sub)" }}>Nenhuma ocorrência nesse filtro.</p>}
      </div>
    </>
  );
}
