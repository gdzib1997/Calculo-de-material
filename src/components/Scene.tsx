import { Suspense, useRef, useState, Component } from "react";
import type { ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Grid,
  OrbitControls,
  Html,
  Line,
} from "@react-three/drei";
import { Vector3 } from "three";
import {
  RotateCcw,
  Move3D,
  Ruler,
  MousePointer2,
  Maximize,
  Compass,
} from "lucide-react";
import { dimensions, isActive, supports, sections } from "../lib/model";
import type { Bed } from "../lib/model";
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
}: {
  w: number;
  l: number;
  removed: boolean;
  onClick: () => void;
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
          color={removed ? "#b5c5bd" : hover ? "#3c8f83" : "#b9c6c9"}
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
              color={hover ? "#27564e" : "#1a344b"}
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
function Structure({
  bed,
  measure,
  onToggle,
}: {
  bed: Bed;
  measure: boolean;
  onToggle: (r: number, c: number) => void;
}) {
  const d = dimensions(bed);
  const legs = supports(bed);
  const baseY = bed.bases ? bed.baseHeight : 0;
  return (
    <group position={[0, baseY, 0]}>
      {legs.map((s, i) => (
        <group key={i}>
          {bed.bases && (
            <mesh position={[s.x, -baseY / 2, s.z]} castShadow receiveShadow>
              <boxGeometry args={[bed.baseWidth, baseY, bed.baseDepth]} />
              <meshStandardMaterial color="#b7b1a3" roughness={1} />
            </mesh>
          )}
          <mesh position={[s.x, s.length / 2, s.z]} castShadow>
            <boxGeometry args={[0.055, s.length, 0.055]} />
            <meshStandardMaterial
              color="#aebbb9"
              metalness={0.65}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[s.x, 0.025, s.z]}>
            <boxGeometry args={[0.16, 0.05, 0.14]} />
            <meshStandardMaterial color="#667e76" metalness={0.55} />
          </mesh>
        </group>
      ))}
      <group
        position={[0, bed.frontHeight + (d.length / 2) * Math.sin(d.rad), 0]}
        rotation={[d.rad, 0, 0]}
      >
        {Array.from({ length: bed.rows }, (_, r) =>
          Array.from({ length: bed.columns }, (_, c) => (
            <group
              key={`${r}:${c}`}
              position={[
                c * (d.w + bed.gap) - (d.width - d.w) / 2,
                0,
                (d.length - d.l) / 2 - r * (d.l + bed.gap),
              ]}
            >
              <Panel
                w={d.w}
                l={d.l}
                removed={!isActive(bed, r, c)}
                onClick={() => onToggle(r, c)}
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
            const width =
              (c - first) * d.w + (c - first - 1) * bed.gap + bed.overhang * 2;
            const x =
              first * (d.w + bed.gap) -
              d.width / 2 +
              (width - bed.overhang * 2) / 2;
            for (const factor of [0.2, 0.8])
              chunks.push(
                <mesh
                  key={`${r}-${first}-${factor}`}
                  position={[
                    x,
                    -0.065,
                    d.length / 2 - r * (d.l + bed.gap) - factor * d.l,
                  ]}
                  castShadow
                >
                  <boxGeometry args={[width, 0.09, 0.06]} />
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
      {sections(bed)
        .filter((s) => s.rows === 2)
        .map((s, index) => {
          const width = s.columns * d.w + (s.columns - 1) * bed.gap;
          const n = Math.ceil(width / bed.supportSpacing) + 1;
          const length = 2 * d.l + bed.gap;
          const local = s.row * (d.l + bed.gap) + length / 2;
          return Array.from({ length: n }, (_, c) => (
            <mesh
              key={`ns${index}-${c}`}
              position={[
                s.column * (d.w + bed.gap) -
                  d.width / 2 +
                  (c * width) / (n - 1),
                bed.frontHeight + local * Math.sin(d.rad) - 0.15,
                d.depth / 2 - local * Math.cos(d.rad),
              ]}
              rotation={[d.rad, 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.06, 0.07, length]} />
              <meshStandardMaterial color="#929f9d" metalness={0.6} />
            </mesh>
          ));
        })}
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
}: {
  bed: Bed;
  onToggle: (r: number, c: number) => void;
}) {
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
            <Structure bed={bed} measure={measure} onToggle={onToggle} />
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
              target={new Vector3(0, 0.5, 0)}
              autoRotate={rotate}
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
