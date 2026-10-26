import { useRef, useState } from "react";
import { ImagePlus, Trash2, LoaderCircle } from "lucide-react";
import type { RoofImage } from "../lib/model";
import { prepareRoofImage } from "../lib/roof";
import Field from "./Field";
export default function RoofEditor({
  roof,
  onChange,
  onError,
}: {
  roof?: RoofImage;
  onChange: (roof: RoofImage | undefined) => void;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const patch = (next: Partial<RoofImage>) => {
    if (roof) onChange({ ...roof, ...next });
  };
  async function load(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const image = await prepareRoofImage(file);
      const width = roof?.width ?? 12;
      onChange({
        dataUrl: image.dataUrl,
        name: image.name,
        width,
        length: Math.max(0.5, Math.min(200, width / image.aspect)),
        x: roof?.x ?? 0,
        z: roof?.z ?? 0,
        rotation: roof?.rotation ?? 0,
        opacity: roof?.opacity ?? 0.9,
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo leer la foto.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="settings-content">
      <div className="section-label">FOTO DEL TECHO COMO SUELO</div>
      <input
        ref={input}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Imagen del techo"
        onChange={(e) => void load(e.target.files?.[0])}
      />
      <button
        className="button outline roof-upload"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <ImagePlus size={16} />
        )}{" "}
        {roof ? "Cambiar imagen" : "Cargar imagen del techo"}
      </button>
      <p className="help-text roof-help">
        JPEG, PNG o WebP · hasta 10 MB. La foto se guarda en tu proyecto, no se
        sube a un servidor.
      </p>
      {roof && (
        <>
          <img
            className="roof-thumbnail"
            src={roof.dataUrl}
            alt="Foto de techo cargada"
          />
          <small className="roof-filename">{roof.name}</small>
          <div className="field-grid">
            <Field
              label="Ancho real del techo"
              value={roof.width}
              onChange={(n) => patch({ width: n })}
              min={0.5}
              max={200}
              unit="m"
            />
            <Field
              label="Largo real del techo"
              value={roof.length}
              onChange={(n) => patch({ length: n })}
              min={0.5}
              max={200}
              unit="m"
            />
          </div>
          <div className="field-grid">
            <Field
              label="Desplazar techo E–O"
              value={roof.x}
              onChange={(n) => patch({ x: n })}
              min={-100}
              max={100}
              unit="m"
            />
            <Field
              label="Desplazar techo N–S"
              value={roof.z}
              onChange={(n) => patch({ z: n })}
              min={-100}
              max={100}
              unit="m"
            />
          </div>
          <Field
            label="Giro de la imagen"
            value={roof.rotation}
            onChange={(n) => patch({ rotation: n })}
            min={0}
            max={360}
            unit="°"
            step={1}
          />
          <Field
            label="Opacidad del techo"
            value={Math.round(roof.opacity * 100)}
            onChange={(n) => patch({ opacity: n / 100 })}
            min={10}
            max={100}
            unit="%"
            step={1}
          />
          <button className="text-button" onClick={() => onChange(undefined)}>
            <Trash2 size={14} /> Quitar imagen del suelo
          </button>
        </>
      )}
      <div className="tip">
        <ImagePlus size={15} />
        <p>
          Configura las medidas reales para ajustar la escala de la foto. La
          imagen es una referencia visual; no detecta obstáculos ni pendientes
          del techo.
        </p>
      </div>
    </div>
  );
}
