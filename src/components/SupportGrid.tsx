import { useState } from "react";
import { supports, supportTracks } from "../lib/model";
import type { Bed } from "../lib/model";
import Field from "./Field";

export default function SupportGrid({
  bed,
  onChange,
  selected,
  onSelect,
}: {
  bed: Bed;
  onChange: (patch: Partial<Bed>) => void;
  selected?: string;
  onSelect?: (id: string) => void;
}) {
  const tracks = supportTracks(bed),
    legs = supports(bed),
    [railId, setRailId] = useState(""),
    rail = tracks.find((t) => t.id === railId) ?? tracks[0],
    leg = legs.find((s) => s.id === selected) ?? legs[0];
  function add() {
    if (!rail || (bed.extraSupports?.length ?? 0) >= 200) return;
    // Busca un espacio libre; la nueva pata sigue perteneciendo al riel elegido.
    const occupied = legs
        .filter((s) => s.trackId === rail.id)
        .map((s) => (rail.axis === "x" ? s.x : s.z)),
      points = [rail.start, ...occupied.sort((a, b) => a - b), rail.end];
    let start = rail.start,
      end = rail.end,
      largest = -1;
    for (let i = 1; i < points.length; i++)
      if (points[i] - points[i - 1] > largest) {
        start = points[i - 1];
        end = points[i];
        largest = end - start;
      }
    const along = (start + end) / 2,
      id = `extra:${crypto.randomUUID()}`;
    onChange({
      extraSupports: [
        ...(bed.extraSupports ?? []),
        {
          id,
          trackId: rail.id,
          x: rail.axis === "x" ? along : rail.fixed,
          z: rail.axis === "z" ? along : rail.fixed,
        },
      ],
    });
    onSelect?.(id);
  }
  return (
    <div className="individual-editor">
      <div className="editor-title">
        <b>Cuadrícula y cantidad de patas</b>
        <span>{legs.length} patas activas</span>
      </div>
      <label className="field">
        <span>Distribución de patas</span>
        <select
          className="full-select"
          aria-label="Distribución de patas"
          value={bed.supportGrid ? "grid" : "auto"}
          onChange={(e) =>
            onChange({
              supportGrid:
                e.target.value === "grid"
                  ? { eastWest: 4, northSouth: 2 }
                  : undefined,
              removedSupports: [],
            })
          }
        >
          <option value="auto">Según separación entre apoyos</option>
          <option value="grid">Cuadrícula elegida por mí</option>
        </select>
      </label>
      {bed.supportGrid && (
        <div className="field-grid">
          <Field
            label="Patas en E–O"
            value={bed.supportGrid.eastWest}
            onChange={(n) =>
              onChange({ supportGrid: { ...bed.supportGrid!, eastWest: n } })
            }
            min={1}
            max={20}
            integer
          />
          <Field
            label="Patas en N–S"
            value={bed.supportGrid.northSouth}
            onChange={(n) =>
              onChange({ supportGrid: { ...bed.supportGrid!, northSouth: n } })
            }
            min={1}
            max={20}
            integer
          />
        </div>
      )}
      <p className="help-text">
        La cuadrícula se aplica a toda la cama. Por ejemplo: 4 E–O × 2 N–S = 8
        patas, antes de tus cambios individuales. Los rieles de apoyo necesarios
        se incluyen en el material. El acomodo de los paneles se conserva.
      </p>
      {onSelect && (
        <>
          <label className="field">
            <span>Riel para añadir pata</span>
            <select
              className="full-select"
              aria-label="Riel para añadir pata"
              value={rail?.id ?? ""}
              onChange={(e) => setRailId(e.target.value)}
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="individual-fields">
            <button
              className="button outline"
              disabled={!rail || (bed.extraSupports?.length ?? 0) >= 200}
              onClick={add}
            >
              Añadir pata al riel
            </button>
            <button
              className="button subtle"
              disabled={!leg}
              onClick={() => {
                if (!leg) return;
                if (leg.id.startsWith("extra:"))
                  onChange({
                    extraSupports: bed.extraSupports?.filter(
                      (s) => s.id !== leg.id,
                    ),
                  });
                else
                  onChange({
                    removedSupports: [...(bed.removedSupports ?? []), leg.id],
                  });
              }}
            >
              Quitar pata seleccionada
            </button>
            {!!bed.removedSupports?.length && (
              <button
                className="button subtle"
                onClick={() => onChange({ removedSupports: [] })}
              >
                Reponer patas retiradas
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
