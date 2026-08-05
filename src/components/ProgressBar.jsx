export default function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
