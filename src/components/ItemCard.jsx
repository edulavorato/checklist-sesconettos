import PhotoCapture from "./PhotoCapture";
import GpsCapture from "./GpsCapture";
import { useGeolocation } from "../hooks/useGeolocation";

export default function ItemCard({ item, response, onAnswer, onPhoto }) {
  const { coords, status, capture } = useGeolocation();

  if (item.type === "text") {
    return (
      <div className="item-card">
        <div className="item-q">{item.question}</div>
        <textarea
          className="textfield"
          rows={2}
          placeholder="Descreva aqui (opcional)"
          value={response?.text || ""}
          onChange={(e) => onAnswer({ text: e.target.value, answer: true })}
        />
      </div>
    );
  }

  return (
    <div className="item-card">
      <div className="item-q">{item.question}</div>
      <div className="toggle-row">
        <button
          className={`toggle ${response?.answer === true ? "yes-active" : ""}`}
          onClick={() => onAnswer({ answer: true })}
        >
          Sim
        </button>
        <button
          className={`toggle ${response?.answer === false ? "no-active" : ""}`}
          onClick={() => onAnswer({ answer: false })}
        >
          Não
        </button>
      </div>
      {item.requiresPhoto && (
        <PhotoCapture
          photoUrl={response?.photoPreview}
          onCapture={(file) => onPhoto(file)}
        />
      )}
      <GpsCapture
        coords={coords}
        status={status}
        onCapture={async () => {
          const value = await capture();
          if (value) onAnswer({ gps: value });
        }}
      />
    </div>
  );
}
