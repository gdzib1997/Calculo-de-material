import { useState } from "react";
import { BookOpen, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { PanelPreset } from "../lib/model";
import Field from "./Field";
export default function PanelLibrary({
  library,
  width,
  length,
  onSave,
  onDelete,
  onClose,
}: {
  library: PanelPreset[];
  width: number;
  length: number;
  onSave: (panel: PanelPreset) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [w, setW] = useState(width);
  const [l, setL] = useState(length);
  const [message, setMessage] = useState("");
  function reset() {
    setId("");
    setName("");
    setW(width);
    setL(length);
  }
  return (
    <div className="modal-backdrop">
      <div
        className="modal library-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
      >
        <div className="library-header">
          <BookOpen size={23} />
          <button
            className="icon-button"
            aria-label="Cerrar biblioteca"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="library-title">Biblioteca de paneles</h2>
        <p>
          Guarda tus modelos una vez y selecciónalos en cualquier cama. Se
          incluyen en la copia de tu proyecto.
        </p>
        <div className="library-list">
          {library.length === 0 && <p>Aún no hay modelos guardados.</p>}
          {library.map((panel) => (
            <div key={panel.id}>
              <span>
                <b>{panel.name}</b>
                <small>
                  {panel.length.toFixed(3)} × {panel.width.toFixed(3)} m
                </small>
              </span>
              <button
                className="icon-button"
                title={`Editar ${panel.name}`}
                onClick={() => {
                  setId(panel.id);
                  setName(panel.name);
                  setW(panel.width);
                  setL(panel.length);
                  setMessage("");
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button"
                title={`Eliminar ${panel.name}`}
                onClick={() => {
                  onDelete(panel.id);
                  if (id === panel.id) reset();
                  setMessage(
                    "Modelo eliminado. Las camas conservan sus medidas.",
                  );
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="divider" />
        <h3 className="library-form-title">
          {id ? "Editar modelo" : "Nuevo modelo de panel"}
          {id && (
            <button className="text-button" onClick={reset}>
              <Plus size={13} /> Nuevo modelo
            </button>
          )}
        </h3>
        <label className="field">
          <span>Nombre / marca / modelo</span>
          <input
            className="text-field"
            aria-label="Nombre del modelo de panel"
            maxLength={100}
            placeholder="Ej. Jinko Tiger Neo 620 W"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="field-grid">
          <Field
            label="Ancho guardado"
            value={w}
            onChange={setW}
            min={0.3}
            max={3}
            unit="m"
            step={0.001}
          />
          <Field
            label="Largo guardado"
            value={l}
            onChange={setL}
            min={0.3}
            max={4}
            unit="m"
            step={0.001}
          />
        </div>
        {id && (
          <p className="help-text">
            Al guardar se actualizan las camas vinculadas a este modelo.
          </p>
        )}
        {message && (
          <div className="library-message" role="status">
            {message}
          </div>
        )}
        <div className="library-actions">
          <button className="button outline" onClick={onClose}>
            Listo
          </button>
          <button
            className="button primary"
            disabled={!name.trim() || (!id && library.length >= 100)}
            onClick={() => {
              onSave({
                id: id || crypto.randomUUID(),
                name: name.trim(),
                width: w,
                length: l,
              });
              setMessage("Modelo guardado en la biblioteca.");
              reset();
            }}
          >
            <Save size={15} /> {id ? "Guardar cambios" : "Guardar modelo"}
          </button>
        </div>
      </div>
    </div>
  );
}
