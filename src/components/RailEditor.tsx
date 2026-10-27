import { useState } from "react";
import {
  dimensions,
  memberCuts,
  railCatalog,
  supportTracks,
  validRailGeometry,
} from "../lib/model";
import type { Bed, RailGeometry } from "../lib/model";
import Field from "./Field";

function GeometryForm({
  bed,
  initial,
  disabled = false,
  submit,
  onSave,
}: {
  bed: Bed;
  initial: RailGeometry;
  disabled?: boolean;
  submit: string;
  onSave: (geometry: RailGeometry) => void;
}) {
  const [geometry, setGeometry] = useState<RailGeometry>({
      axis: initial.axis,
      start: initial.start,
      end: initial.end,
      fixed: initial.fixed,
      panelMount: !!initial.panelMount,
    }),
    [error, setError] = useState("");
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!validRailGeometry(bed, geometry)) {
          setError(
            "El final debe superar al inicio por al menos 5 cm y el riel debe quedar sobre el suelo. Revisa las medidas.",
          );
          return;
        }
        setError("");
        onSave(geometry);
      }}
    >
      <div className="individual-fields">
        <Field
          label={
            geometry.axis === "x"
              ? "Inicio E–O del riel"
              : "Inicio N–S del riel"
          }
          value={Number(geometry.start.toFixed(3))}
          onChange={(start) => setGeometry((g) => ({ ...g, start }))}
          min={-200}
          max={200}
          unit="m"
          step={0.001}
          disabled={disabled}
        />
        <Field
          label={
            geometry.axis === "x" ? "Final E–O del riel" : "Final N–S del riel"
          }
          value={Number(geometry.end.toFixed(3))}
          onChange={(end) => setGeometry((g) => ({ ...g, end }))}
          min={-200}
          max={200}
          unit="m"
          step={0.001}
          disabled={disabled}
        />
        <Field
          label={
            geometry.axis === "x"
              ? "Posición N–S del riel"
              : "Posición E–O del riel"
          }
          value={Number(geometry.fixed.toFixed(3))}
          onChange={(fixed) => setGeometry((g) => ({ ...g, fixed }))}
          min={-200}
          max={200}
          unit="m"
          step={0.001}
          disabled={disabled}
        />
      </div>
      <label className="rail-mount-option">
        <input
          type="checkbox"
          aria-label="Sujetar paneles con este riel"
          checked={!!geometry.panelMount}
          disabled={disabled}
          onChange={(e) =>
            setGeometry((g) => ({ ...g, panelMount: e.target.checked }))
          }
        />
        Sujetar paneles con este riel (contar clamps compatibles)
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="button outline" disabled={disabled}>
        {submit}
      </button>
    </form>
  );
}
export default function RailEditor({
  bed,
  selected,
  onSelect,
  onChange,
}: {
  bed: Bed;
  selected?: string;
  onSelect: (id: string) => void;
  onChange: (patch: Partial<Bed>) => void;
}) {
  const catalog = railCatalog(bed),
    active = supportTracks(bed),
    rail = catalog.find((t) => t.id === selected) ?? active[0] ?? catalog[0],
    [axis, setAxis] = useState<"x" | "z">("x"),
    [name, setName] = useState(""),
    removed = rail && bed.removedRails?.includes(rail.id),
    d = dimensions(bed),
    disabled =
      (axis === "x" ? bed.ewMode : bed.nsMode) === "exclude" ||
      (bed.manualRails?.length ?? 0) >= 200,
    cut = memberCuts(bed).find((c) => c.id === rail?.id);
  const defaultGeometry: RailGeometry =
    axis === "x"
      ? {
          axis,
          start: d.minX,
          end: d.maxX,
          fixed: d.frontZ - d.rowCenters[0] * Math.cos(d.rad),
          panelMount: true,
        }
      : {
          axis,
          start: d.backZ,
          end: d.frontZ,
          fixed: d.centerX,
          panelMount: true,
        };
  return (
    <div className="rail-editor">
      <div className="table-toolbar">
        <div>
          <h3>Rieles individuales</h3>
          <p>
            Selecciona en el 3D o en la lista. Activa «Mostrar sólo estructura»
            para ver los rieles bajo los paneles.
          </p>
        </div>
        <b>{active.length} rieles activos</b>
      </div>
      <div className="individual-editor">
        <label className="field">
          <span>Riel seleccionado</span>
          <select
            className="full-select"
            aria-label="Riel seleccionado"
            value={rail?.id ?? ""}
            onChange={(e) => onSelect(e.target.value)}
          >
            {catalog.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {bed.removedRails?.includes(t.id) ? " · retirado" : ""}
              </option>
            ))}
          </select>
        </label>
        {rail ? (
          <>
            <p className="help-text">
              Eje {rail.axis === "x" ? "E–O" : "N–S"}
              {cut
                ? ` · corte ${cut.length.toFixed(3)} m · ${cut.pieces} piezas comerciales`
                : " · riel retirado"}
            </p>
            <div className="individual-fields">
              <button
                className="button outline"
                disabled={!!removed || (bed.removedRails?.length ?? 0) >= 1000}
                onClick={() =>
                  onChange({
                    removedRails: [...(bed.removedRails ?? []), rail.id],
                  })
                }
              >
                Eliminar riel seleccionado
              </button>
              <button
                className="button outline"
                disabled={!removed}
                onClick={() =>
                  onChange({
                    removedRails: bed.removedRails?.filter(
                      (id) => id !== rail.id,
                    ),
                  })
                }
              >
                Reponer riel seleccionado
              </button>
              {bed.railOverrides?.[rail.id] && (
                <button
                  className="button subtle"
                  onClick={() => {
                    const overrides = { ...bed.railOverrides };
                    delete overrides[rail.id];
                    onChange({ railOverrides: overrides });
                  }}
                >
                  Restablecer medidas del riel
                </button>
              )}
            </div>
            <GeometryForm
              key={`${bed.id}:${rail.id}:${JSON.stringify(bed.railOverrides?.[rail.id])}`}
              bed={bed}
              initial={rail}
              disabled={!!removed}
              submit="Aplicar medidas del riel"
              onSave={(g) =>
                onChange({
                  railOverrides: { ...bed.railOverrides, [rail.id]: g },
                })
              }
            />
          </>
        ) : (
          <p>
            No hay rieles disponibles. Activa un sentido en Estructura o añade
            un riel.
          </p>
        )}
        {!!bed.removedRails?.length && (
          <button
            className="button subtle"
            onClick={() => onChange({ removedRails: [] })}
          >
            Reponer todos los rieles
          </button>
        )}
      </div>
      <div className="individual-editor">
        <div className="editor-title">
          <b>Añadir riel</b>
        </div>
        <label className="field">
          <span>Sentido del nuevo riel</span>
          <select
            className="full-select"
            aria-label="Sentido del nuevo riel"
            value={axis}
            onChange={(e) => setAxis(e.target.value as "x" | "z")}
          >
            <option value="x">Este–oeste (E–O)</option>
            <option value="z">Norte–sur (N–S)</option>
          </select>
        </label>
        <label className="field">
          <span>Nombre del nuevo riel</span>
          <input
            aria-label="Nombre del nuevo riel"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre opcional"
          />
        </label>
        {disabled && (
          <p className="help-text">
            Activa este sentido de riel en Estructura para añadirlo. Se admiten
            hasta 200 rieles manuales por cama.
          </p>
        )}
        <GeometryForm
          key={`${bed.id}:new:${axis}`}
          bed={bed}
          initial={defaultGeometry}
          disabled={disabled}
          submit="Añadir riel a la cama"
          onSave={(g) => {
            const id = `manual-rail:${crypto.randomUUID()}`;
            onChange({
              manualRails: [
                ...(bed.manualRails ?? []),
                {
                  ...g,
                  id,
                  name:
                    name.trim() ||
                    `Riel manual ${axis === "x" ? "E–O" : "N–S"} ${1 + (bed.manualRails?.length ?? 0)}`,
                },
              ],
            });
            onSelect(id);
            setName("");
          }}
        />
      </div>
      <p className="help-text">
        Las coordenadas son locales a la cama y las distancias N–S son
        horizontales. Los cortes consideran la inclinación y el sobrante. Añade
        o retira sus patas en «Patas y bases» y sus diagonales en
        «Contravientos». Al eliminar un riel se ocultan sus patas y diagonales
        dependientes; al reponerlo se recuperan. Las cantidades finales fijadas
        manualmente se conservan.
      </p>
    </div>
  );
}
