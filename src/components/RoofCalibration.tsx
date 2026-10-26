import { useRef, useState } from "react";
import { Ruler, Trash2, X, Check } from "lucide-react";
import type { Point2, RoofImage } from "../lib/model";
import { calibrateRoof } from "../lib/model";
import Field from "./Field";
export default function RoofCalibration({
  roof,
  panelWidth,
  panelLength,
  onApply,
  onClose,
}: {
  roof: RoofImage;
  panelWidth: number;
  panelLength: number;
  onApply: (roof: RoofImage) => void;
  onClose: () => void;
}) {
  const svg = useRef<SVGSVGElement>(null),
    [points, setPoints] = useState<Point2[]>([]),
    [distance, setDistance] = useState(1),
    [error, setError] = useState("");
  const aspect = roof.imageAspect ?? roof.width / roof.length,
    h = 1000 / aspect,
    refs = roof.references ?? [];
  function apply() {
    if (points.length !== 2) return;
    try {
      const reference = {
        id: crypto.randomUUID(),
        from: points[0],
        to: points[1],
        distance,
      };
      onApply(calibrateRoof(roof, [...refs, reference]));
      setPoints([]);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo calcular la escala.",
      );
    }
  }
  return (
    <div className="modal-backdrop">
      <div
        className="modal calibration-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calibration-title"
      >
        <div className="library-header">
          <Ruler size={24} />
          <button
            className="icon-button"
            aria-label="Cerrar calibración"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="calibration-title">Escala del techo por referencias</h2>
        <p>
          {refs.length < 2
            ? points.length === 0
              ? "Marca el inicio de una distancia conocida en la foto."
              : points.length === 1
                ? "Marca el final de esa distancia."
                : "Introduce su medida real y aplica la referencia."
            : "Dos referencias aplicadas. Puedes borrar una para reemplazarla."}
        </p>
        <svg
          ref={svg}
          className="calibration-canvas"
          role="img"
          aria-label="Foto para marcar referencia"
          viewBox={`0 0 1000 ${h}`}
          preserveAspectRatio="xMidYMid meet"
          onClick={(e) => {
            if (refs.length >= 2) return;
            const p = svg.current!.createSVGPoint();
            p.x = e.clientX;
            p.y = e.clientY;
            const local = p.matrixTransform(
              svg.current!.getScreenCTM()!.inverse(),
            );
            const value = { x: local.x / 1000, y: local.y / h };
            if (value.x < 0 || value.x > 1 || value.y < 0 || value.y > 1)
              return;
            setPoints((p) => (p.length === 2 ? [value] : [...p, value]));
            setError("");
          }}
        >
          <image href={roof.dataUrl} x={0} y={0} width={1000} height={h} />
          {refs.map((r, i) => (
            <g key={r.id} pointerEvents="none">
              <line
                x1={r.from.x * 1000}
                y1={r.from.y * h}
                x2={r.to.x * 1000}
                y2={r.to.y * h}
                stroke={i ? "#f4a44b" : "#a4dc74"}
                strokeWidth={6}
              />
              <text
                x={(r.from.x + r.to.x) * 500}
                y={((r.from.y + r.to.y) * h) / 2 - 12}
                fill="white"
                stroke="#173a31"
                strokeWidth={1}
                fontSize={32}
              >
                R{i + 1} · {r.distance} m
              </text>
            </g>
          ))}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x * 1000}
              cy={p.y * h}
              r={12}
              fill="#f1d55c"
              stroke="#213a29"
              strokeWidth={3}
              pointerEvents="none"
            />
          ))}
          {points.length === 2 && (
            <line
              x1={points[0].x * 1000}
              y1={points[0].y * h}
              x2={points[1].x * 1000}
              y2={points[1].y * h}
              stroke="#f1d55c"
              strokeWidth={5}
              pointerEvents="none"
            />
          )}
        </svg>
        <div className="individual-fields">
          <Field
            label="Medida real de la referencia"
            value={distance}
            onChange={setDistance}
            min={0.01}
            max={500}
            unit="m"
          />
          <button
            className="button outline"
            onClick={() => setDistance(panelWidth)}
          >
            Ancho de panel · {panelWidth} m
          </button>
          <button
            className="button outline"
            onClick={() => setDistance(panelLength)}
          >
            Largo de panel · {panelLength} m
          </button>
          <button
            className="button primary"
            disabled={points.length !== 2 || refs.length >= 2}
            onClick={apply}
          >
            <Check size={15} /> Aplicar referencia
          </button>
        </div>
        <div className="calibration-refs">
          {refs.map((r, i) => (
            <span key={r.id}>
              Referencia {i + 1}: {r.distance} m
              <button
                className="icon-button"
                title={`Eliminar referencia ${i + 1}`}
                onClick={() => {
                  onApply({
                    ...roof,
                    references: refs.filter((v) => v.id !== r.id),
                  });
                  setError("");
                }}
              >
                <Trash2 size={13} />
              </button>
            </span>
          ))}
        </div>
        {error && (
          <p role="alert" className="calibration-error">
            {error}
          </p>
        )}
        <p className="help-text">
          Una referencia conserva la proporción de la foto; dos referencias, una
          más horizontal y otra más vertical, ajustan ambos ejes. Usa vista
          superior: no se corrige la perspectiva de una foto inclinada.
        </p>
        <b className="calibration-size">
          Escala actual: {roof.width.toFixed(3)} × {roof.length.toFixed(3)} m
        </b>
      </div>
    </div>
  );
}
