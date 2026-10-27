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
      {(
        [
          ["ewMode", "Rieles este–oeste"],
          ["nsMode", "Rieles norte–sur"],
        ] as const
      ).map(([key, label]) => (
        <label className="field" key={key}>
          <span>{label}</span>
          <select
            className="full-select"
            aria-label={label}
            value={bed[key] === "exclude" ? "exclude" : "include"}
            onChange={(e) => onChange({ [key]: e.target.value })}
          >
            <option value="include">Incluir {label.toLowerCase()}</option>
            <option value="exclude">No incluir {label.toLowerCase()}</option>
          </select>
        </label>
      ))}
      {bed.nsMode !== "exclude" && bed.ewMode !== "exclude" && (
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
        Elige los rieles independientemente del número de filas. Los clamps
        sujetan los paneles verticales en E–O y los horizontales en N–S. Coloca
        los contravientos eligiendo dos patas.
      </p>
      <div className="divider" />
    </>
  );
}
