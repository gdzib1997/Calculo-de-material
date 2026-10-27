import { useState } from "react";
import type { Project } from "../lib/model";
import type { PdfView } from "../lib/pdf-views";
import { prepareRoofImage } from "../lib/roof";
export default function PdfDialog({
  project,
  views,
  onChange,
  onClose,
  onExport,
}: {
  project: Project;
  views: PdfView[];
  onChange: (patch: Partial<Project>) => void;
  onClose: () => void;
  onExport: (views: PdfView[]) => void;
}) {
  const [selected, setSelected] = useState(views.map((v) => v.id)),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  return (
    <div className="modal-backdrop">
      <section
        className="modal pdf-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Preparar PDF"
      >
        <h2>PDF de materiales</h2>
        <p>
          Elige las vistas. Para guardar otros ángulos, cierra esta ventana,
          acomoda el 3D y pulsa «Guardar vista para PDF».
        </p>
        <label className="field">
          <span>Proyecto</span>
          <input
            aria-label="Proyecto en PDF"
            value={project.name}
            maxLength={120}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Cliente</span>
          <input
            aria-label="Cliente en PDF"
            value={project.customer}
            maxLength={150}
            onChange={(e) => onChange({ customer: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Ubicación</span>
          <input
            aria-label="Ubicación en PDF"
            value={project.location ?? ""}
            maxLength={200}
            onChange={(e) => onChange({ location: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Logo de Soleon (imagen original)</span>
          <input
            aria-label="Logo de Soleon"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={loading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setLoading(true);
              setError("");
              try {
                const img = await prepareRoofImage(file);
                onChange({
                  brandLogo: { dataUrl: img.dataUrl, name: img.name },
                });
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "No se pudo cargar el logo.",
                );
              } finally {
                setLoading(false);
              }
            }}
          />
        </label>
        {project.brandLogo && (
          <div className="pdf-logo">
            <img
              src={project.brandLogo.dataUrl}
              alt="Logo de Soleon para PDF"
            />
            <button
              className="text-button"
              onClick={() => onChange({ brandLogo: undefined })}
            >
              Quitar logo
            </button>
          </div>
        )}
        {!project.brandLogo && (
          <p className="help-text">
            Sin imagen cargada, se utiliza el nombre SOLEON en naranja.
          </p>
        )}
        <div className="pdf-views">
          {views.map((v) => (
            <label className="pdf-view" key={v.id}>
              <input
                type="checkbox"
                aria-label={`Incluir ${v.title}`}
                checked={selected.includes(v.id)}
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, v.id]
                      : ids.filter((id) => id !== v.id),
                  )
                }
              />
              <img src={v.dataUrl} alt={v.title} />
              <span>{v.title}</span>
            </label>
          ))}
        </div>
        <p className="help-text">
          {selected.length} vistas seleccionadas. Sin vistas, se exporta sólo la
          lista de materiales.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="individual-fields">
          <button className="button outline" onClick={onClose}>
            Volver al 3D
          </button>
          <button
            className="button primary"
            disabled={loading}
            onClick={() =>
              onExport(views.filter((v) => selected.includes(v.id)))
            }
          >
            Descargar PDF
          </button>
        </div>
      </section>
    </div>
  );
}
