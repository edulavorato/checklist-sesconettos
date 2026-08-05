// Gráfico de linha simples (SVG puro, sem biblioteca externa) para mostrar
// a evolução da nota ao longo das últimas aplicações do checklist.

export default function TrendChart({ series }) {
  if (!series.length) {
    return <div className="empty-hint">Ainda não há aplicações suficientes para o gráfico.</div>;
  }

  const width = 320;
  const height = 120;
  const padding = 8;
  const max = 100;
  const min = 0;

  const points = series.map((point, i) => {
    const x = series.length === 1
      ? width / 2
      : padding + (i / (series.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.score - min) / (max - min)) * (height - padding * 2);
    return { x, y, score: point.score };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="trend-chart">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--line)" strokeWidth="1" />
      <path d={areaPath} fill="var(--primary-soft)" />
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--primary)" />
      ))}
    </svg>
  );
}
