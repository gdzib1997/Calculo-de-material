import { Wind } from "lucide-react";
import type { Bed } from "../lib/model";
import { braces } from "../lib/model";
import Field from "./Field";
export default function RailOptions({
  bed,
  onChange,
}: {
  bed: Bed;
  onChange: (patch: Partial<Bed>) => void;
}) {
  const diagonal =
    braces({ ...bed, bracingEnabled: true, bracingLength: undefined })[0]
      ?.length ?? 0;
  return (
    <>
      <label className="field">
        <span>Rieles norte–sur</span>
        <select
          className="full-select"
          aria-label="Rieles norte–sur"
          value={bed.nsMode ?? "auto"}
          onChange={(e) =>
            onChange({ nsMode: e.target.value as Bed["nsMode"] })
          }
        >
          <option value="auto">Automático · sólo tramos dobles</option>
          <option value="include">Incluir rieles norte–sur</option>
          <option value="exclude">No incluir rieles norte–sur</option>
        </select>
      </label>
      {bed.nsMode !== "exclude" && (
        <Field
          label="Beam Clip por cruce N–S / E–O"
          value={bed.beamClipsPerCrossing ?? 1}
          onChange={(n) => onChange({ beamClipsPerCrossing: n })}
          min={1}
          max={8}
          integer
        />
      )}
      <p className="help-text">
        Los Beam Clip automáticos se cuentan sólo en los cruces de rieles
        norte–sur habilitados. Puedes ajustar el factor por cruce.
      </p>
      <div className="divider" />
      <div className="switch-row">
        <div>
          <b>Rieles como contravientos</b>
          <small>Sumarlos al total de rieles</small>
        </div>
        <button
          role="switch"
          aria-label="Contemplar contravientos"
          aria-checked={!!bed.bracingEnabled}
          className={`switch ${bed.bracingEnabled ? "on" : ""}`}
          onClick={() => onChange({ bracingEnabled: !bed.bracingEnabled })}
        >
          <span />
        </button>
      </div>
      {bed.bracingEnabled && (
        <>
          <label className="field">
            <span>Eje de contravientos</span>
            <select
              className="full-select"
              aria-label="Eje de contravientos"
              value={bed.bracingAxis ?? "ew"}
              onChange={(e) =>
                onChange({ bracingAxis: e.target.value as Bed["bracingAxis"] })
              }
            >
              <option value="ew">Este–oeste</option>
              <option value="ns">Norte–sur</option>
            </select>
          </label>
          <Field
            label="Número de diagonales"
            value={bed.bracingCount ?? 2}
            onChange={(n) => onChange({ bracingCount: n })}
            min={0}
            max={100}
            integer
          />
          <label className="check-field">
            <input
              type="checkbox"
              aria-label="Longitud automática de contravientos"
              checked={bed.bracingLength === undefined}
              onChange={(e) =>
                onChange({
                  bracingLength: e.target.checked
                    ? undefined
                    : Math.max(0.1, Number(diagonal.toFixed(3))),
                })
              }
            />{" "}
            Longitud según patas y geometría
          </label>
          {bed.bracingLength !== undefined ? (
            <Field
              label="Longitud considerada por diagonal"
              value={bed.bracingLength}
              onChange={(n) => onChange({ bracingLength: n })}
              min={0.1}
              max={50}
              unit="m"
            />
          ) : (
            <p className="help-text">
              Primera diagonal: {diagonal.toFixed(3)} m. Las longitudes se
              recalculan al mover las patas.
            </p>
          )}
          <div className="tip">
            <Wind size={15} />
            <p>
              Se suman piezas comerciales por diagonal, sin descontar sobrantes.
              La posición en 3D es esquemática y requiere revisión de
              conexiones.
            </p>
          </div>
        </>
      )}
      <div className="divider" />
    </>
  );
}
