// Gera o PDF final de uma aplicação de checklist — cabeçalho com os dados
// da aplicação, resumo, resultado por área, lista detalhada dos itens e,
// por fim, as fotos anexadas (evidências). O layout é inspirado no
// relatório que o ChecklistFácil já gerava, para manter o mesmo padrão
// que a gestão está acostumada a receber.

// jsPDF é importado dinamicamente dentro de generateChecklistPDF (em vez de
// no topo do arquivo) para não engordar o carregamento inicial do app —
// ele só é baixado quando alguém realmente clica em "Gerar PDF".

const BRAND_PRIMARY = [149, 11, 10]; // #950b0a
const BRAND_ACCENT = [196, 122, 0]; // #c47a00 (laranja escurecido p/ contraste em texto)
const INK = [32, 20, 15];
const SUB = [110, 100, 88];
const LINE = [230, 224, 207];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;

function formatDateTime(date) {
  if (!date) return "—";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatDuration(start, end) {
  if (!start || !end) return "—";
  const ms = end.getTime() - start.getTime();
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function loadImageSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 4, h: 3 });
    img.src = dataUrl;
  });
}

function answerLabel(item, response) {
  if (!response || response.answer === undefined) {
    if (item.type === "text") return response?.text ? response.text : "(sem descrição)";
    return "— não respondido —";
  }
  if (item.type === "currency") return `R$ ${Number(response.text || 0).toFixed(2)}`;
  return response.answer ? "Sim" : "Não";
}

function addFooter(doc, pageNum, totalPages) {
  doc.setFontSize(8);
  doc.setTextColor(...SUB);
  doc.text("Sesconetto's · Checklist Unidades", MARGIN, PAGE_H - 8);
  doc.text(`${pageNum} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
}

export async function generateChecklistPDF({ template, result, responses, photos, user, unitId, startedAt, finishedAt, runId }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  // --- Cabeçalho ---
  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(0, 0, PAGE_W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(template.name.toUpperCase(), MARGIN, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Relatório de aplicação${runId ? " · #" + runId.slice(-8).toUpperCase() : ""}`, MARGIN, 22);

  y = 38;
  doc.setTextColor(...INK);

  const infoRows = [
    ["Autor", user?.email || "—"],
    ["Unidade", unitId || "—"],
    ["Período de aplicação", `${formatDateTime(startedAt)} até ${formatDateTime(finishedAt)} (${formatDuration(startedAt, finishedAt)})`],
    ["Gerado em", formatDateTime(new Date())],
  ];
  doc.setFontSize(9);
  infoRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SUB);
    doc.text(label.toUpperCase(), MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    doc.text(String(value), MARGIN + 52, y);
    y += 6;
  });

  y += 4;
  doc.setDrawColor(...LINE);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // --- Resumo (3 tiles) ---
  const tileW = (PAGE_W - MARGIN * 2 - 8) / 3;
  const tiles = [
    [`${result.totalOk}/${result.totalItems}`, "ITENS RESPONDIDOS"],
    [`${result.finalScore}%`, "NOTA FINAL"],
    [`${result.inconformities}`, "INCONFORMIDADES"],
  ];
  tiles.forEach(([num, label], i) => {
    const x = MARGIN + i * (tileW + 4);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, tileW, 20, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...BRAND_PRIMARY);
    doc.text(num, x + tileW / 2, y + 10, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SUB);
    doc.text(label, x + tileW / 2, y + 16, { align: "center" });
  });
  y += 28;

  // --- Resultado por área ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Resultado por área", MARGIN, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Área", "Resultado", "%"]],
    body: result.areaResults.map((a) => [a.areaName, `${a.ok}/${a.total}`, `${a.pct}%`]),
    styles: { fontSize: 9, textColor: INK, lineColor: LINE },
    headStyles: { fillColor: BRAND_PRIMARY, textColor: 255 },
    alternateRowStyles: { fillColor: [250, 248, 241] },
  });
  y = doc.lastAutoTable.finalY + 12;

  // --- Itens detalhados (uma tabela por área) ---
  template.areas.forEach((area, idx) => {
    if (y > PAGE_H - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...BRAND_ACCENT);
    doc.text(`Área ${idx + 1} · ${area.name}`, MARGIN, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Item", "Peso", "Obrigatório", "Resposta"]],
      body: area.items.map((item) => [
        item.question,
        item.type === "text" ? "—" : String(item.weight ?? "—"),
        item.required ? "Sim" : "Não",
        answerLabel(item, responses[item.id]),
      ]),
      styles: { fontSize: 8.5, textColor: INK, lineColor: LINE },
      headStyles: { fillColor: [244, 238, 224], textColor: INK, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 78 }, 1: { cellWidth: 18, halign: "center" }, 2: { cellWidth: 26, halign: "center" } },
    });
    y = doc.lastAutoTable.finalY + 8;
  });

  // --- Anexos (fotos) ---
  const photoEntries = Object.entries(photos || {}).filter(([, url]) => !!url);
  if (photoEntries.length) {
    doc.addPage();
    y = 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text("Anexos", MARGIN, y);
    y += 8;

    const imgW = 82;
    let col = 0;
    let rowMaxH = 0;
    let x = MARGIN;

    for (const [itemId, dataUrl] of photoEntries) {
      const item = template.areas.flatMap((a) => a.items).find((i) => i.id === itemId);
      const { w, h } = await loadImageSize(dataUrl);
      const imgH = Math.min(70, imgW * (h / w));

      if (y + imgH + 10 > PAGE_H - 16) {
        doc.addPage();
        y = 20;
        col = 0;
        x = MARGIN;
      }
      if (col === 2) {
        col = 0;
        x = MARGIN;
        y += rowMaxH + 12;
        rowMaxH = 0;
        if (y + imgH + 10 > PAGE_H - 16) {
          doc.addPage();
          y = 20;
        }
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...SUB);
      const caption = item?.question || itemId;
      doc.text(caption, x, y - 2, { maxWidth: imgW });

      try {
        doc.addImage(dataUrl, "JPEG", x, y, imgW, imgH, undefined, "FAST");
        doc.setDrawColor(...LINE);
        doc.rect(x, y, imgW, imgH, "S");
      } catch {
        doc.text("(não foi possível carregar a imagem)", x, y + 6);
      }

      rowMaxH = Math.max(rowMaxH, imgH);
      x += imgW + 10;
      col += 1;
    }
  }

  // --- Numeração de páginas em todas as folhas ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, p, totalPages);
  }

  const fileName = `${template.id}_${(unitId || "unidade").replace(/\s+/g, "-")}_${(finishedAt || new Date()).toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
