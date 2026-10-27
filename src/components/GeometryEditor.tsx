import { RotateCw, RotateCcw, Move } from "lucide-react";
import {
  dimensions,
  isActive,
  panelKey,
  panelRotation,
  supports,
  supportNeighbours,
  supportTracks,
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
        Cada fila conserva sus paneles juntos. Girar otra fila no cambia sus
        posiciones ni sus rieles.
      </p>
    </div>
  );
}
export function LegEditor({
  bed,
  selected,
  onSelect,
  onMove,
  onTrack,
  onReset,
  onResetAll,
}: {
  bed: Bed;
  selected?: string;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  onTrack: (id: string, track: string) => void;
  onReset: (id: string) => void;
  onResetAll: () => void;
}) {
  const all = supports(bed),
    leg = all.find((s) => s.id === selected) || all[0],
    tracks = supportTracks(bed);
  if (!leg)
    return (
      <div className="individual-editor">
        No hay patas activas. Añade una sobre un riel o repón las patas
        retiradas.
      </div>
    );
  const track = tracks.find((t) => t.id === leg.trackId)!,
    near = supportNeighbours(bed, leg.id).previous;
  return (
    <div className="individual-editor">
      <div className="editor-title">
        <Move size={17} />
        <b>Pata sobre su riel</b>
        <span>Eje {leg.axis === "x" ? "X · Este–oeste" : "Y · Norte–sur"}</span>
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
                P-{String(i + 1).padStart(2, "0")} · fila {s.row + 1}
                {s.moved ? " · manual" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Riel de desplazamiento</span>
          <select
            aria-label="Riel de desplazamiento"
            value={leg.trackId}
            onChange={(e) => onTrack(leg.id, e.target.value)}
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Posición de pata E–O"
          value={Number(leg.x.toFixed(3))}
          onChange={(x) => onMove(leg.id, x, leg.z)}
          min={leg.axis === "x" ? track.start : leg.x}
          max={leg.axis === "x" ? track.end : leg.x}
          disabled={leg.axis !== "x"}
          unit="m"
        />
        <Field
          label="Posición de pata N–S"
          value={Number(leg.z.toFixed(3))}
          onChange={(z) => onMove(leg.id, leg.x, z)}
          min={leg.axis === "z" ? track.start : leg.z}
          max={leg.axis === "z" ? track.end : leg.z}
          disabled={leg.axis !== "z"}
          unit="m"
        />
        <div className="leg-height">
          <span>Longitud de la pata</span>
          <b>{leg.length.toFixed(3)} m</b>
        </div>
      </div>
      <div className="individual-fields spacing-fields">
        {near && (
          <Field
            label="Separación con pata anterior sobre el riel"
            value={Number(
              (leg.axis === "x" ? leg.x - near.x : leg.z - near.z).toFixed(3),
            )}
            onChange={(v) =>
              onMove(
                leg.id,
                leg.axis === "x" ? near.x + v : leg.x,
                leg.axis === "z" ? near.z + v : leg.z,
              )
            }
            min={0.02}
            max={track.end - (leg.axis === "x" ? near.x : near.z)}
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
        Elige el riel de la pata. Al arrastrarla sólo se desplaza a lo largo de
        ese eje y permanece unida al riel.
      </p>
    </div>
  );
}
