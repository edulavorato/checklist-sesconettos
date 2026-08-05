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

function fmtCoords(loc) {
  if (!loc) return null;
  return `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
}

function answerLabel(item, response) {
  if (!response || response.answer === undefined) {
    if (item.type === "text") return response?.text ? response.text : "(sem descrição)";
    return "— não respondido —";
  }
  if (item.type === "currency") return `R$ ${Number(response.text || 0).toFixed(2)}`;
  return response.answer ? "Sim" : "Não";
}

// Mini-gráfico "Últimos resultados" (nota do checklist ao longo do tempo +
// inconformidades por data), no estilo do que o ChecklistFácil já mostrava
// dentro do próprio PDF de cada aplicação — não só num painel separado.
function drawHistoryChart(doc, series, x, y, w, h) {
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, y, w, h, 2, 2, "S");

  if (!series.length) {
    doc.setFontSize(8.5);
    doc.setTextColor(...SUB);
    doc.text("Ainda não há aplicações anteriores para comparar.", x + w / 2, y + h / 2, { align: "center" });
    return h;
  }

  const padTop = 8;
  const chartH = h - 26; // reserva espaço embaixo para datas + inconformidades
  const padSide = 10;
  const innerW = w - padSide * 2;

  const points = series.map((pt, i) => ({
    x: x + padSide + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW),
    y: y + padTop + (chartH - padTop) * (1 - (pt.score ?? 0) / 100),
    pt,
  }));

  doc.setDrawColor(...BRAND_PRIMARY);
  doc.setLineWidth(0.6);
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
  }
  doc.setFillColor(...BRAND_PRIMARY);
  points.forEach((p) => doc.circle(p.x, p.y, 0.9, "F"));
  doc.setLineWidth(0.2);

  doc.setFontSize(6.5);
  points.forEach((p) => {
    doc.setTextColor(...BRAND_PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.text(String(p.pt.score ?? "—"), p.x, p.y - 2.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SUB);
    const d = p.pt.date;
    doc.text(d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—", p.x, y + chartH + 5, { align: "center" });

    doc.setTextColor(...BRAND_ACCENT);
    doc.text(String(p.pt.inconformities ?? 0), p.x, y + chartH + 10, { align: "center" });
  });

  doc.setFontSize(6);
  doc.setTextColor(...SUB);
  doc.text("Nota", x + 2, y + chartH + 5);
  doc.text("Inconf.", x + 2, y + chartH + 10);

  return h;
}

function addFooter(doc, pageNum, totalPages) {
  doc.setFontSize(8);
  doc.setTextColor(...SUB);
  doc.text("Sesconetto's · Checklist Unidades", MARGIN, PAGE_H - 8);
  doc.text(`${pageNum} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
}

export async function generateChecklistPDF({ template, result, responses, photos, user, authorName, authorRole, unitId, startedAt, finishedAt, runId, startLocation, endLocation, startAddress, endAddress, historySeries, variationByArea }) {
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

  const authorLabel = authorName || user?.email || "—";
  const infoRows = [
    ["Autor", authorRole ? `${authorLabel} · ${authorRole}` : authorLabel],
    ["Unidade", unitId || "—"],
    ["Período de aplicação", `${formatDateTime(startedAt)} até ${formatDateTime(finishedAt)} (${formatDuration(startedAt, finishedAt)})`],
    ["Gerado em", formatDateTime(new Date())],
  ];
  if (startLocation) {
    infoRows.push(["Localização (início)", startAddress || fmtCoords(startLocation)]);
  }
  if (endLocation) {
    infoRows.push(["Localização (final)", endAddress || fmtCoords(endLocation)]);
  }
  doc.setFontSize(9);
  infoRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SUB);
    doc.text(label.toUpperCase(), MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(String(value), PAGE_W - MARGIN - (MARGIN + 52));
    doc.text(lines, MARGIN + 52, y);
    y += 6 * lines.length;
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

  // --- Últimos resultados (histórico da unidade neste checklist) ---
  if (historySeries && historySeries.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("Últimos resultados", MARGIN, y);
    y += 4;
    const chartH = 38;
    drawHistoryChart(doc, historySeries, MARGIN, y, PAGE_W - MARGIN * 2, chartH);
    y += chartH + 10;
  }

  // --- Resultado por área ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Resultado por área", MARGIN, y);
  y += 4;

  const hasVariation = variationByArea && Object.keys(variationByArea).length > 0;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [hasVariation ? ["Área", "Resultado", "%", "Variação"] : ["Área", "Resultado", "%"]],
    body: result.areaResults.map((a) => {
      const row = [a.areaName, `${a.ok}/${a.total}`, `${a.pct}%`];
      if (hasVariation) {
        const delta = variationByArea[a.areaId];
        row.push(delta === undefined ? "—" : `${delta > 0 ? "+" : ""}${delta}%`);
      }
      return row;
    }),
    styles: { fontSize: 9, textColor: INK, lineColor: LINE },
    headStyles: { fillColor: BRAND_PRIMARY, textColor: 255 },
    alternateRowStyles: { fillColor: [250, 248, 241] },
    ...(hasVariation
      ? {
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 3) {
              const raw = String(data.cell.raw || "");
              if (raw.startsWith("+")) data.cell.styles.textColor = [26, 157, 92];
              else if (raw.startsWith("-")) data.cell.styles.textColor = BRAND_PRIMARY;
            }
          },
        }
      : {}),
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

// Desenha o gráfico de evolução da nota diretamente com primitivas do PDF
// (linhas/círculos), já que aqui não temos como reaproveitar o componente
// React <TrendChart> que roda no navegador.
function drawTrendChart(doc, series, x, y, w, h) {
  doc.setDrawColor(...LINE);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, "S");

  if (!series.length) {
    doc.setFontSize(8.5);
    doc.setTextColor(...SUB);
    doc.text("Sem dados suficientes para o gráfico.", x + w / 2, y + h / 2, { align: "center" });
    return;
  }

  const pad = 6;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const points = series.map((pt, i) => ({
    x: x + pad + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW),
    y: y + pad + innerH - (pt.score / 100) * innerH,
  }));

  doc.setDrawColor(...BRAND_PRIMARY);
  doc.setLineWidth(0.6);
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
  }
  doc.setFillColor(...BRAND_PRIMARY);
  points.forEach((p) => doc.circle(p.x, p.y, 0.9, "F"));
  doc.setLineWidth(0.2);
}

export async function generateManagementPDF({ overall, trend, series, unitRows, runs, templates }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(0, 0, PAGE_W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PAINEL DE GESTÃO", MARGIN, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Todas as unidades · gerado em ${formatDateTime(new Date())}`, MARGIN, 22);

  y = 40;
  doc.setTextColor(...INK);

  const tileW = (PAGE_W - MARGIN * 2 - 8) / 3;
  const tiles = [
    [`${overall.avgScore}%`, "MÉDIA GERAL"],
    [`${overall.totalInconformities}`, "INCONFORMIDADES"],
    [`${overall.count}`, "APLICAÇÕES"],
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
  y += 26;

  if (trend !== null && trend !== undefined) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...(trend >= 0 ? [26, 157, 92] : BRAND_PRIMARY));
    doc.text(`${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)} pontos vs. aplicações anteriores`, MARGIN, y);
    y += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Evolução da nota", MARGIN, y);
  y += 4;
  drawTrendChart(doc, series, MARGIN, y, PAGE_W - MARGIN * 2, 45);
  y += 55;

  if (y > PAGE_H - 60) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Resultado por unidade", MARGIN, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Unidade", "Aplicações", "Inconform.", "Média"]],
    body: unitRows.map((u) => [u.unitId, String(u.count), String(u.totalInconformities), `${u.avgScore}%`]),
    styles: { fontSize: 9, textColor: INK, lineColor: LINE },
    headStyles: { fillColor: BRAND_PRIMARY, textColor: 255 },
    alternateRowStyles: { fillColor: [250, 248, 241] },
  });
  y = doc.lastAutoTable.finalY + 12;

  if (y > PAGE_H - 40) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Últimas aplicações", MARGIN, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Data", "Checklist", "Unidade", "Nota", "Inconform."]],
    body: runs.slice(0, 40).map((r) => {
      const tpl = templates?.[r.templateId];
      const d = r.finishedAt?.toDate ? r.finishedAt.toDate() : null;
      return [formatDateTime(d), tpl?.name || r.templateId, r.unitId || "—", `${r.finalScore ?? "—"}%`, String(r.inconformities ?? "—")];
    }),
    styles: { fontSize: 8.5, textColor: INK, lineColor: LINE },
    headStyles: { fillColor: [244, 238, 224], textColor: INK, fontStyle: "bold" },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, p, totalPages);
  }

  doc.save(`painel_gestao_${new Date().toISOString().slice(0, 10)}.pdf`);
}
