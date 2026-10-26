import { RotateCw, RotateCcw, Move } from "lucide-react";
import {
  dimensions,
  isActive,
  panelKey,
  panelRotation,
  supports,
  supportNeighbours,
} from "../lib/model";
import type { Bed, Support } from "../lib/model";
import Field from "./Field";
export function PanelEditor({
  bed,
  selected,
  onSelect,
  onRotate,
  onToggle,
}: {
  bed: Bed;
  selected: string;
  onSelect: (key: string) => void;
  onRotate: (angle: number) => void;
  onToggle: () => void;
}) {
  const [r, c] = selected.split(":").map(Number);
  const angle = panelRotation(bed, r, c);
  return (
    <div className="individual-editor">
      <div className="editor-title">
        <RotateCw size={17} />
        <b>Giro individual del panel</b>
        <span>Dentro del plano de la cama</span>
      </div>
      <div className="individual-fields">
        <label className="field">
          <span>Panel individual</span>
          <select
            aria-label="Panel individual"
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
          >
            {Array.from({ length: bed.rows }, (_, r) =>
              Array.from({ length: bed.columns }, (_, c) => (
                <option key={panelKey(r, c)} value={panelKey(r, c)}>
                  Fila {r + 1} · Columna {c + 1}
                  {!isActive(bed, r, c) ? " · retirado" : ""}
                </option>
              )),
            )}
          </select>
        </label>
        <Field
          label="Giro del panel"
          value={angle}
          onChange={onRotate}
          min={0}
          max={359}
          step={1}
          unit="°"
        />
        <button
          className="button outline"
          onClick={() => onRotate((angle + 90) % 360)}
        >
          <RotateCw size={14} /> Girar 90°
        </button>
        <button className="button subtle" onClick={() => onRotate(0)}>
          <RotateCcw size={14} /> Restablecer giro
        </button>
        <button className="button subtle" onClick={onToggle}>
          {isActive(bed, r, c) ? "Quitar panel" : "Reponer panel"}
        </button>
      </div>
      <p className="help-text">
        Las celdas se amplían según el giro para mantener la separación entre
        paneles. La inclinación de la cama se conserva.
      </p>
    </div>
  );
}
export function LegEditor({
  bed,
  selected,
  onSelect,
  onMove,
  onReset,
  onResetAll,
}: {
  bed: Bed;
  selected?: string;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  onReset: (id: string) => void;
  onResetAll: () => void;
}) {
  const all = supports(bed),
    leg = all.find((s) => s.id === selected) || all[0],
    d = dimensions(bed);
  if (!leg)
    return (
      <div className="individual-editor">
        No hay patas: repón algún panel para generar apoyos.
      </div>
    );
  const neighbours = supportNeighbours(bed, leg.id);
  const maxNS = neighbours.opposite
    ? leg.line === 0
      ? d.depth / 2 - neighbours.opposite.z
      : neighbours.opposite.z + d.depth / 2
    : 0;
  return (
    <div className="individual-editor">
      <div className="editor-title">
        <Move size={17} />
        <b>Posición individual de la pata</b>
        <span>{leg.moved ? "Ajuste manual" : "Posición automática"}</span>
      </div>
      <div className="individual-fields">
        <label className="field">
          <span>Pata seleccionada</span>
          <select
            aria-label="Pata seleccionada"
            value={leg.id}
            onChange={(e) => onSelect(e.target.value)}
          >
            {all.map((s, i) => (
              <option key={s.id} value={s.id}>
                P-{String(i + 1).padStart(2, "0")} · fila {s.row + 1} ·{" "}
                {s.line === 0 ? "sur" : "norte"}
                {s.moved ? " · manual" : ""}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Posición de pata E–O"
          value={Number(leg.x.toFixed(3))}
          onChange={(n) => onMove(leg.id, n, leg.z)}
          min={-d.width / 2}
          max={d.width / 2}
          step={0.01}
          unit="m"
        />
        <Field
          label="Posición de pata N–S"
          value={Number(leg.z.toFixed(3))}
          onChange={(n) => onMove(leg.id, leg.x, n)}
          min={-d.depth / 2}
          max={d.depth / 2}
          step={0.01}
          unit="m"
        />
        <div className="leg-height">
          <span>Altura recalculada</span>
          <b>{leg.length.toFixed(3)} m</b>
        </div>
      </div>
      <div className="individual-fields spacing-fields">
        {neighbours.previous && (
          <Field
            label="Separación con pata anterior E–O"
            value={Number((leg.x - neighbours.previous.x).toFixed(3))}
            onChange={(n) => onMove(leg.id, neighbours.previous!.x + n, leg.z)}
            min={0.05}
            max={d.width / 2 - neighbours.previous.x}
            unit="m"
          />
        )}
        {neighbours.opposite && maxNS >= 0.05 && (
          <Field
            label="Separación con pata opuesta N–S"
            value={Number(Math.abs(leg.z - neighbours.opposite.z).toFixed(3))}
            onChange={(n) =>
              onMove(
                leg.id,
                leg.x,
                neighbours.opposite!.z + (leg.line === 0 ? n : -n),
              )
            }
            min={0.05}
            max={maxNS}
            unit="m"
          />
        )}
        <button
          className="button outline"
          disabled={!leg.moved}
          onClick={() => onReset(leg.id)}
        >
          <RotateCcw size={14} /> Restablecer esta pata
        </button>
        <button
          className="button subtle"
          disabled={!Object.keys(bed.supportOverrides || {}).length}
          onClick={onResetAll}
        >
          Restablecer todas
        </button>
      </div>
      <p className="help-text">
        También puedes arrastrar una pata en el modelo. X positivo = este; Z
        positivo = sur. Sólo se mueve la pata seleccionada y su bloque; las
        otras conservan su posición.
      </p>
    </div>
  );
}
