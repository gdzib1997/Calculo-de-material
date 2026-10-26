import { useState } from "react";
export default function Field({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  unit,
  integer = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  integer?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="number-field">
        <input
          aria-label={label}
          type="number"
          inputMode="decimal"
          value={focused ? draft : String(value)}
          onFocus={() => {
            setDraft(String(value));
            setFocused(true);
          }}
          min={min}
          max={max}
          step={integer ? 1 : step}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (
              e.target.value !== "" &&
              Number.isFinite(n) &&
              n >= min &&
              n <= max &&
              (!integer || Number.isInteger(n))
            )
              onChange(n);
          }}
          onBlur={() => setFocused(false)}
        />
        {unit && <span>{unit}</span>}
      </div>
    </label>
  );
}
