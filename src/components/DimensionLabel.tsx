import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, Sprite, Vector3, SRGBColorSpace } from "three";

// Las cotas forman parte del canvas: se capturan en PDF y no insertan nodos DOM.
export default function DimensionLabel({
  text,
  position,
}: {
  text: string;
  position: [number, number, number];
}) {
  const sprite = useRef<Sprite>(null),
    world = useMemo(() => new Vector3(), []),
    viewport = useThree((s) => s.viewport),
    label = useMemo(() => {
      const canvas = document.createElement("canvas"),
        context = canvas.getContext("2d")!;
      context.font = "500 24px Arial, sans-serif";
      canvas.width = Math.ceil(context.measureText(text).width) + 28;
      canvas.height = 48;
      context.font = "500 24px Arial, sans-serif";
      context.fillStyle = "#f4f8ef";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#c8d5c0";
      context.lineWidth = 2;
      context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
      context.fillStyle = "#36543a";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      return { texture, width: canvas.width / 2, height: canvas.height / 2 };
    }, [text]);
  useEffect(() => () => label.texture.dispose(), [label]);
  useFrame(({ camera }) => {
    if (!sprite.current) return;
    sprite.current.getWorldPosition(world);
    const factor = viewport.getCurrentViewport(camera, world).factor;
    if (factor > 0)
      sprite.current.scale.set(label.width / factor, label.height / factor, 1);
  });
  return (
    <sprite
      ref={sprite}
      position={position}
      renderOrder={1000}
      raycast={() => undefined}
    >
      <spriteMaterial
        map={label.texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
