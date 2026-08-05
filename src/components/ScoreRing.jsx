export default function ScoreRing({ score }) {
  const color = score >= 90 ? "#1aa15c" : score >= 70 ? "#e59a2f" : "#d64545";
  return (
    <div
      className="score-ring"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #e3e5e9 0deg)` }}
    >
      <div className="score-inner">
        <div className="score-num" style={{ color }}>{score}</div>
        <div className="score-label">NOTA FINAL</div>
      </div>
    </div>
  );
}
