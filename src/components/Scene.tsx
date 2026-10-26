import { Suspense, useRef, useState, useEffect, Component } from "react";
import type { ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Grid,
  OrbitControls,
  Html,
  Line,
} from "@react-three/drei";
import { Vector3, Plane, Texture, SRGBColorSpace, Quaternion } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import {
  RotateCcw,
  Move3D,
  Ruler,
  MousePointer2,
  Maximize,
  Compass,
} from "lucide-react";
import {
  dimensions,
  isActive,
  supports,
  sections,
  supportLines,
  sectionDimensions,
  panelRotation,
  panelKey,
  northSouthSections,
  braces,
} from "../lib/model";
import type { Bed, RoofImage, Support } from "../lib/model";
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <Move3D size={38} />
        <h3>Vista 3D no disponible</h3>
        <p>
          Este navegador no tiene WebGL disponible. Puedes editar la
          distribución en la pestaña de paneles.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Camera({ view, span }: { view: string; span: number }) {
  const { camera } = useThree();
  const previous = useRef("");
  if (previous.current !== view) {
    previous.current = view;
    const positions: Record<string, number[]> = {
      iso: [span * 0.72, span * 0.72, span * 0.95],
      top: [0, span * 1.35, 0.001],
      front: [0, span * 0.24, span * 1.3],
      side: [span * 1.3, span * 0.3, 0],
    };
    const pos = positions[view] || positions.iso;
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  return null;
}
function Panel({
  w,
  l,
  removed,
  onClick,
  selected = false,
}: {
  w: number;
  l: number;
  removed: boolean;
  onClick: () => void;
  selected?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, 0.045, l]} />
        <meshStandardMaterial
          color={
            removed ? "#b5c5bd" : hover || selected ? "#7eae52" : "#b9c6c9"
          }
          transparent
          opacity={removed ? 0.14 : 1}
          wireframe={removed}
        />
      </mesh>
      {!removed && (
        <>
          <mesh position={[0, 0.027, 0]}>
            <boxGeometry args={[w - 0.045, 0.012, l - 0.045]} />
            <meshStandardMaterial
              color={selected ? "#41633e" : hover ? "#27564e" : "#1a344b"}
              metalness={0.35}
              roughness={0.38}
            />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh
              key={`v${i}`}
              position={[-w / 2 + ((i + 1) * w) / 7, 0.035, 0]}
            >
              <boxGeometry args={[0.004, 0.002, l - 0.05]} />
              <meshBasicMaterial color="#637d8c" />
            </mesh>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <mesh
              key={`h${i}`}
              position={[0, 0.035, -l / 2 + ((i + 1) * l) / 11]}
            >
              <boxGeometry args={[w - 0.05, 0.002, 0.004]} />
              <meshBasicMaterial color="#5c7384" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
export type EditMode = "remove" | "panel" | "support";
interface EditingProps {
  mode: EditMode;
  selectedPanel: string;
  selectedSupport?: string;
  onSelectPanel: (r: number, c: number) => void;
  onSelectSupport: (id: string) => void;
  onMoveSupport: (id: string, x: number, z: number) => void;
}
function Roof({ roof }: { roof: RoofImage }) {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let disposed = false;
    let map: Texture | undefined;
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      map = new Texture(image);
      map.colorSpace = SRGBColorSpace;
      map.needsUpdate = true;
      setTexture(map);
    };
    image.src = roof.dataUrl;
    return () => {
      disposed = true;
      image.onload = null;
      map?.dispose();
    };
  }, [roof.dataUrl]);
  if (!texture) return null;
  return (
    <group
      position={[roof.x, -0.035, roof.z]}
      rotation={[0, (-roof.rotation * Math.PI) / 180, 0]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roof.width, roof.length]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={roof.opacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
function Leg({
  bed,
  leg,
  enabled,
  selected,
  onSelect,
  onMove,
  onDragging,
  measure,
  index,
}: {
  bed: Bed;
  leg: Support;
  enabled: boolean;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, z: number) => void;
  onDragging: (v: boolean) => void;
  measure: boolean;
  index: number;
}) {
  const drag = useRef<{ x: number; z: number } | null>(null);
  const baseY = bed.bases ? bed.baseHeight : 0;
  const point = (event: ThreeEvent<PointerEvent>) =>
    event.ray.intersectPlane(
      new Plane(new Vector3(0, 1, 0), -baseY),
      new Vector3(),
    );
  const release = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    event.stopPropagation();
    drag.current = null;
    onDragging(false);
    (
      event.target as unknown as { releasePointerCapture: (id: number) => void }
    ).releasePointerCapture(event.pointerId);
  };
  return (
    <group
      onClick={(e) => {
        if (enabled) {
          e.stopPropagation();
          onSelect();
        }
      }}
      onPointerDown={(e) => {
        if (!enabled || e.button !== 0) return;
        e.stopPropagation();
        const p = point(e);
        if (!p) return;
        drag.current = { x: leg.x - p.x, z: leg.z - p.z };
        onSelect();
        onDragging(true);
        (
          e.target as unknown as { setPointerCapture: (id: number) => void }
        ).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!enabled || !drag.current) return;
        e.stopPropagation();
        const p = point(e);
        if (p) onMove(p.x + drag.current.x, p.z + drag.current.z);
      }}
      onPointerUp={release}
    >
      {bed.bases && (
        <mesh position={[leg.x, -baseY / 2, leg.z]} castShadow receiveShadow>
          <boxGeometry args={[bed.baseWidth, baseY, bed.baseDepth]} />
          <meshStandardMaterial
            color={selected ? "#aabd83" : "#b7b1a3"}
            roughness={1}
          />
        </mesh>
      )}
      <mesh position={[leg.x, leg.length / 2, leg.z]} castShadow>
        <boxGeometry
          args={[enabled ? 0.105 : 0.055, leg.length, enabled ? 0.105 : 0.055]}
        />
        <meshStandardMaterial
          color={selected ? "#739d42" : enabled ? "#547d66" : "#aebbb9"}
          metalness={0.65}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[leg.x, 0.025, leg.z]}>
        <boxGeometry args={[0.16, 0.05, 0.14]} />
        <meshStandardMaterial
          color={selected ? "#729b42" : "#667e76"}
          metalness={0.55}
        />
      </mesh>
      {(selected || measure) && (
        <Html
          position={[leg.x, leg.length + 0.15, leg.z]}
          center
          style={{ pointerEvents: "none" }}
        >
          <span className="dimension-label">
            P-{String(index + 1).padStart(2, "0")} · {leg.length.toFixed(3)} m
          </span>
        </Html>
      )}
    </group>
  );
}
function BraceBeam({
  from,
  to,
}: {
  from: [number, number, number];
  to: [number, number, number];
}) {
  const a = new Vector3(...from),
    b = new Vector3(...to),
    delta = b.clone().sub(a),
    center = a.clone().add(b).multiplyScalar(0.5),
    rotation = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      delta.clone().normalize(),
    );
  return (
    <mesh position={center} quaternion={rotation} castShadow>
      <boxGeometry args={[0.045, delta.length(), 0.045]} />
      <meshStandardMaterial color="#7b9b83" metalness={0.6} roughness={0.35} />
    </mesh>
  );
}
function Structure({
  bed,
  measure,
  onToggle,
  mode,
  selectedPanel,
  selectedSupport,
  onSelectPanel,
  onSelectSupport,
  onMoveSupport,
  onDragging,
}: {
  bed: Bed;
  measure: boolean;
  onToggle: (r: number, c: number) => void;
  onDragging: (v: boolean) => void;
} & EditingProps) {
  const d = dimensions(bed),
    legs = supports(bed),
    baseY = bed.bases ? bed.baseHeight : 0;
  return (
    <group position={[0, baseY, 0]}>
      {legs.map((leg, index) => (
        <Leg
          key={leg.id}
          bed={bed}
          leg={leg}
          measure={measure}
          index={index}
          enabled={mode === "support"}
          selected={mode === "support" && leg.id === selectedSupport}
          onSelect={() => onSelectSupport(leg.id)}
          onMove={(x, z) => onMoveSupport(leg.id, x, z)}
          onDragging={onDragging}
        />
      ))}
      <group
        position={[0, bed.frontHeight + (d.length / 2) * Math.sin(d.rad), 0]}
        rotation={[d.rad, 0, 0]}
      >
        {Array.from({ length: bed.rows }, (_, r) =>
          Array.from({ length: bed.columns }, (_, c) => (
            <group
              key={panelKey(r, c)}
              position={[
                d.columnCenters[c] - d.width / 2,
                0,
                d.length / 2 - d.rowCenters[r],
              ]}
              rotation={[0, (panelRotation(bed, r, c) * Math.PI) / 180, 0]}
            >
              <Panel
                w={d.w}
                l={d.l}
                removed={!isActive(bed, r, c)}
                selected={mode === "panel" && selectedPanel === panelKey(r, c)}
                onClick={() => {
                  if (mode === "remove") onToggle(r, c);
                  else if (mode === "panel") onSelectPanel(r, c);
                }}
              />
            </group>
          )),
        )}
        {Array.from({ length: bed.rows }, (_, r) => {
          const chunks: ReactNode[] = [];
          let c = 0;
          while (c < bed.columns) {
            if (!isActive(bed, r, c)) {
              c++;
              continue;
            }
            const first = c;
            while (c < bed.columns && isActive(bed, r, c)) c++;
            const span =
              d.columnWidths.slice(first, c).reduce((a, n) => a + n, 0) +
              (c - first - 1) * bed.gap;
            const x =
              d.columnCenters[first] -
              d.columnWidths[first] / 2 -
              d.width / 2 +
              span / 2;
            for (const [line, distance] of supportLines(bed, r).entries())
              chunks.push(
                <mesh
                  key={`${r}-${first}-${line}`}
                  position={[x, -0.065, d.length / 2 - distance]}
                  castShadow
                >
                  <boxGeometry args={[span + bed.overhang * 2, 0.09, 0.06]} />
                  <meshStandardMaterial
                    color="#bfc7c5"
                    metalness={0.7}
                    roughness={0.28}
                  />
                </mesh>,
              );
          }
          return chunks;
        })}
      </group>
      {northSouthSections(bed).map((s, index) => {
        const bounds = sectionDimensions(bed, s),
          n = Math.ceil(bounds.width / bed.supportSpacing) + 1;
        const local = bounds.startDistance + bounds.length / 2;
        return Array.from({ length: n }, (_, c) => (
          <mesh
            key={`ns${index}-${c}`}
            position={[
              bounds.startX + (c * bounds.width) / (n - 1),
              bed.frontHeight + local * Math.sin(d.rad) - 0.15,
              d.depth / 2 - local * Math.cos(d.rad),
            ]}
            rotation={[d.rad, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.06, 0.07, bounds.length]} />
            <meshStandardMaterial color="#929f9d" metalness={0.6} />
          </mesh>
        ));
      })}
      {braces(bed).map((brace, i) => (
        <BraceBeam key={`brace${i}`} from={brace.from} to={brace.to} />
      ))}
      {measure && (
        <>
          <Line
            points={[
              [-d.width / 2, 0, d.depth / 2 + 0.8],
              [d.width / 2, 0, d.depth / 2 + 0.8],
            ]}
            color="#46745c"
            lineWidth={1.5}
          />
          <Html position={[0, 0, d.depth / 2 + 1]} center>
            <span className="dimension-label">{d.width.toFixed(2)} m</span>
          </Html>
          <Html
            position={[d.width / 2 + 0.5, d.rearHeight / 2, -d.depth / 2]}
            center
          >
            <span className="dimension-label">
              ↑ {d.rearHeight.toFixed(2)} m
            </span>
          </Html>
          <Html
            position={[-d.width / 2 - 0.5, bed.frontHeight / 2, d.depth / 2]}
            center
          >
            <span className="dimension-label">
              ↑ {bed.frontHeight.toFixed(2)} m
            </span>
          </Html>
        </>
      )}
    </group>
  );
}
export default function Scene({
  bed,
  onToggle,
  roof,
  mode,
  onModeChange,
  selectedPanel,
  selectedSupport,
  onSelectPanel,
  onSelectSupport,
  onMoveSupport,
}: {
  bed: Bed;
  roof?: RoofImage;
  onToggle: (r: number, c: number) => void;
  onModeChange: (mode: EditMode) => void;
} & EditingProps) {
  const [dragging, setDragging] = useState(false);
  const [measure, setMeasure] = useState(false);
  const [view, setView] = useState("iso");
  const [reset, setReset] = useState(0);
  const [rotate, setRotate] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const d = dimensions(bed);
  const span = Math.max(d.width + bed.overhang * 2, d.length, 5);
  return (
    <div className="scene" ref={root}>
      <div className="scene-top">
        <span className="view-badge">
          <span /> VISTA 3D EN TIEMPO REAL
        </span>
        <div className="view-selector">
          {[
            ["iso", "Perspectiva"],
            ["top", "Superior"],
            ["front", "Frontal"],
            ["side", "Lateral"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => {
                setView(id);
                setReset((v) => v + 1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="scene-editbar">
        {(
          [
            ["remove", "Quitar paneles"],
            ["panel", "Girar paneles"],
            ["support", "Mover patas"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-label={`${label} en 3D`}
            className={mode === value ? "active" : ""}
            onClick={() => {
              setDragging(false);
              onModeChange(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <SceneBoundary>
        <Suspense
          fallback={<div className="scene-fallback">Preparando modelo 3D…</div>}
        >
          <Canvas
            key={reset}
            shadows
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            camera={{ position: [10, 9, 13], fov: 38, near: 0.1, far: 500 }}
            dpr={[1, 1.5]}
            onCreated={({ gl }) => {
              gl.setClearColor("#edf0e9");
            }}
          >
            <Camera view={view} span={span} />
            <ambientLight intensity={1.7} />
            <directionalLight
              position={[8, 15, 6]}
              intensity={3}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-left={-20}
              shadow-camera-right={20}
              shadow-camera-top={20}
              shadow-camera-bottom={-20}
              shadow-bias={-0.0004}
            />
            {roof && <Roof roof={roof} />}
            <Structure
              bed={bed}
              measure={measure}
              onToggle={onToggle}
              mode={mode}
              selectedPanel={selectedPanel}
              selectedSupport={selectedSupport}
              onSelectPanel={onSelectPanel}
              onSelectSupport={onSelectSupport}
              onMoveSupport={onMoveSupport}
              onDragging={setDragging}
            />
            <Grid
              position={[0, -0.015, 0]}
              args={[100, 100]}
              cellSize={1}
              cellThickness={0.45}
              cellColor="#c8d0c3"
              sectionSize={5}
              sectionThickness={0.65}
              sectionColor="#b7c1b1"
              fadeDistance={45}
              fadeStrength={1.5}
              infiniteGrid
            />
            <ContactShadows
              position={[0, -0.01, 0]}
              opacity={0.25}
              scale={50}
              blur={2}
              far={6}
              resolution={256}
            />
            <OrbitControls
              makeDefault
              enabled={!dragging}
              target={new Vector3(0, 0.5, 0)}
              autoRotate={rotate && !dragging}
              autoRotateSpeed={0.6}
              minDistance={2}
              maxDistance={80}
              minPolarAngle={0.01}
              maxPolarAngle={Math.PI - 0.01}
            />
          </Canvas>
        </Suspense>
      </SceneBoundary>
      <div className="scene-compass">
        <Compass size={28} strokeWidth={1} />
        <b>N</b>
      </div>
      <div className="scene-bottom">
        <span className="scene-hint">
          <MousePointer2 size={14} /> Arrastra para girar · Rueda para zoom ·
          Clic para quitar
        </span>
        <div className="scene-tools">
          <button
            title="Girar automáticamente"
            className={rotate ? "active" : ""}
            onClick={() => setRotate(!rotate)}
          >
            <Move3D size={18} />
          </button>
          <button
            title="Mostrar medidas"
            className={measure ? "active" : ""}
            onClick={() => setMeasure(!measure)}
          >
            <Ruler size={18} />
          </button>
          <button
            title="Restablecer cámara"
            onClick={() => {
              setView("iso");
              setReset((v) => v + 1);
            }}
          >
            <RotateCcw size={18} />
          </button>
          <button
            title="Pantalla completa"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void root.current?.requestFullscreen().catch(() => {});
            }}
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
