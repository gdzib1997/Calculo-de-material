import { useState } from "react";
import { Plus, Trash2, Wind, ArrowLeftRight } from "lucide-react";
import { supports, braces, braceConnections, braceAxis } from "../lib/model";
import type { Bed } from "../lib/model";
export default function BraceEditor({
  bed,
  first,
  onFirst,
  onAdd,
  onRemove,
  onReverse,
  onMode,
}: {
  bed: Bed;
  first: string;
  onFirst: (id: string) => void;
  onAdd: (from: string, to: string) => void;
  onRemove: (id: string) => void;
  onReverse: (id: string) => void;
  onMode: () => void;
}) {
  const all = supports(bed),
    connections = braceConnections(bed),
    active = braces(bed),
    [second, setSecond] = useState("");
  const label = (id: string) => {
    const i = all.findIndex((s) => s.id === id);
    return i < 0
      ? "Pata no disponible"
      : `P-${String(i + 1).padStart(2, "0")} · fila ${all[i].row + 1}`;
  };
  const a = all.find((s) => s.id === first),
    b = all.find((s) => s.id === second),
    axis = a && b ? braceAxis(a, b) : undefined;
  return (
    <div className="brace-editor">
      <div className="table-toolbar">
        <div>
          <h3>Contravientos entre patas</h3>
          <p>Elige dos patas alineadas o selecciónalas directamente en 3D.</p>
        </div>
        <button className="button outline" onClick={onMode}>
          <Wind size={15} /> Seleccionar patas en 3D
        </button>
      </div>
      <div className="individual-editor">
        <div className="individual-fields">
          <label className="field">
            <span>Pata de origen</span>
            <select
              aria-label="Pata de origen del contraviento"
              value={first}
              onChange={(e) => onFirst(e.target.value)}
            >
              <option value="">Selecciona una pata</option>
              {all.map((s) => (
                <option key={s.id} value={s.id}>
                  {label(s.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Pata de destino</span>
            <select
              aria-label="Pata de destino del contraviento"
              value={second}
              onChange={(e) => setSecond(e.target.value)}
            >
              <option value="">Selecciona otra pata</option>
              {all
                .filter((s) => s.id !== first)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {label(s.id)}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="button primary"
            disabled={!axis}
            onClick={() => {
              onAdd(first, second);
              setSecond("");
            }}
          >
            <Plus size={15} /> Agregar contraviento
          </button>
        </div>
        <p className="help-text">
          {axis
            ? axis === "ew"
              ? "E–O: 2 L-Foot, uno por extremo."
              : "N–S: 2 Tilt Plate, uno por extremo."
            : first && second
              ? "Las patas deben estar alineadas en E–O o N–S."
              : "No se generan contravientos automáticamente."}
        </p>
      </div>
      <div className="brace-list">
        {!connections.length && (
          <p className="empty-state">
            Selecciona las patas que quieres unir para colocar el primer
            contraviento.
          </p>
        )}
        {connections.map((c) => {
          const item = active.find((v) => v.id === c.id);
          return (
            <div className="brace-row" key={c.id}>
              <Wind size={19} />
              <div>
                <b>
                  {label(c.fromId)} → {label(c.toId)}
                </b>
                <small>
                  {item
                    ? `${item.length.toFixed(3)} m · ${c.axis === "ew" ? "2 L-Foot" : "2 Tilt Plate"}`
                    : "Patas ausentes o desalineadas: vuelve a colocar esta unión."}
                </small>
              </div>
              <button
                className="icon-button"
                title="Invertir diagonal"
                onClick={() => onReverse(c.id)}
              >
                <ArrowLeftRight size={16} />
              </button>
              <button
                className="icon-button"
                title="Eliminar contraviento"
                onClick={() => onRemove(c.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
