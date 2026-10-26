import { Move, RotateCw } from "lucide-react";
import type { Bed } from "../lib/model";
import Field from "./Field";
export default function BedPlacement({
  bed,
  pose,
  onMove,
  onRotate,
  onDrag,
}: {
  bed: Bed;
  pose: { x: number; z: number; rotation: number };
  onMove: (x: number, z: number) => void;
  onRotate: (angle: number) => void;
  onDrag: () => void;
}) {
  return (
    <div className="individual-editor">
      <div className="editor-title">
        <Move size={17} />
        <b>Ubicación de {bed.name}</b>
        <span>Sobre el techo del proyecto</span>
      </div>
      <div className="individual-fields">
        <Field
          label="Posición de cama E–O"
          value={Number(pose.x.toFixed(3))}
          onChange={(x) => onMove(x, pose.z)}
          min={-200}
          max={200}
          unit="m"
        />
        <Field
          label="Posición de cama N–S"
          value={Number(pose.z.toFixed(3))}
          onChange={(z) => onMove(pose.x, z)}
          min={-200}
          max={200}
          unit="m"
        />
        <Field
          label="Giro de la cama en el techo"
          value={pose.rotation}
          onChange={onRotate}
          min={0}
          max={359}
          step={1}
          unit="°"
        />
        <button className="button outline" onClick={onDrag}>
          <Move size={15} /> Mover camas en 3D
        </button>
      </div>
      <p className="help-text">
        Todas las camas se ven en el mismo espacio. Arrastra una cama para
        acomodarla y usa «Desplazar vista» para recorrer el techo sin mover los
        objetos.
      </p>
    </div>
  );
}
