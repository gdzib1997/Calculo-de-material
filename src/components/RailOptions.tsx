import type { Bed } from "../lib/model";
import Field from "./Field";
export default function RailOptions({
  bed,
  onChange,
}: {
  bed: Bed;
  onChange: (patch: Partial<Bed>) => void;
}) {
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
        Coloca los contravientos eligiendo dos patas en la pestaña
        «Contravientos» o directamente en 3D.
      </p>
      <div className="divider" />
    </>
  );
}
