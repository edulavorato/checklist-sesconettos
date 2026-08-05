import { useEffect, useRef, useState } from "react";

// Campo de assinatura simples por canvas — funciona tanto com o dedo (mobile)
// quanto com o mouse (desktop). Não depende de nenhuma lib externa.
export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const lastPointRef = useRef(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#20140f";
  }, []);

  function getPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  }

  function move(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setEmpty(false);
    }
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (hasDrawnRef.current) {
      onChange?.(canvasRef.current.toDataURL("image/png"));
    }
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    hasDrawnRef.current = false;
    setEmpty(true);
    onChange?.(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: 150,
          background: "#fff",
          border: "1.5px solid var(--line)",
          borderRadius: 10,
          touchAction: "none",
          cursor: "crosshair",
        }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "var(--sub)" }}>
          {empty ? "Assine com o dedo ou o mouse acima" : "Assinatura registrada"}
        </span>
        <button
          type="button"
          className="btn outline"
          style={{ padding: "6px 12px", fontSize: 12, width: "auto" }}
          onClick={handleClear}
          disabled={empty}
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
