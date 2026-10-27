import {
  Suspense,
  useRef,
  useState,
  useEffect,
  useMemo,
  Component,
} from "react";
import type { ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, OrbitControls, Line } from "@react-three/drei";
import {
  Vector3,
  Plane,
  Texture,
  SRGBColorSpace,
  Quaternion,
  Group,
  MOUSE,
  TOUCH,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import {
  RotateCcw,
  Move3D,
  Ruler,
  MousePointer2,
  Maximize,
  Compass,
  Move,
  Wrench,
  Layers,
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
  bedPose,
  projectBounds,
  supportTracks,
  northSouthSections,
  braces,
  panelClamps,
} from "../lib/model";
import type { Bed, RoofImage, Support, Project } from "../lib/model";
import { Connector, Clamp } from "./Hardware";
import DimensionLabel from "./DimensionLabel";
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
function Camera({
  view,
  span,
  center,
  revision,
}: {
  view: string;
  span: number;
  center: [number, number, number];
  revision: number;
}) {
  const { camera } = useThree();
  useEffect(() => {
    const positions: Record<string, number[]> = {
      iso: [span * 0.72, span * 0.72, span * 0.95],
      top: [0, span * 1.35, 0.001],
      front: [0, span * 0.24, span * 1.3],
      side: [span * 1.3, span * 0.3, 0],
    };
    const p = positions[view] ?? positions.iso;
    camera.position.set(p[0] + center[0], p[1] + center[1], p[2] + center[2]);
    camera.lookAt(...center);
    camera.updateProjectionMatrix();
  }, [camera, view, span, center[0], center[1], center[2], revision]);
  return null;
}
function Panel({
  w,
  l,
  removed,
  onClick,
  selected = false,
  interactive = true,
  detailed = true,
}: {
  w: number;
  l: number;
  removed: boolean;
  onClick: () => void;
  selected?: boolean;
  interactive?: boolean;
  detailed?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <group
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        if (!interactive) return;
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
          {detailed &&
            Array.from({ length: 6 }, (_, i) => (
              <mesh
                key={`v${i}`}
                position={[-w / 2 + ((i + 1) * w) / 7, 0.035, 0]}
              >
                <boxGeometry args={[0.004, 0.002, l - 0.05]} />
                <meshBasicMaterial color="#637d8c" />
              </mesh>
            ))}
          {detailed &&
            Array.from({ length: 10 }, (_, i) => (
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
export type EditMode =
  "navigate" | "remove" | "panel" | "support" | "brace" | "bed" | "rail";
interface EditingProps {
  mode: EditMode;
  selectedPanel: string;
  selectedSupport?: string;
  selectedRail?: string;
  onSelectRail: (id: string) => void;
  onSelectPanel: (r: number, c: number) => void;
  onSelectSupport: (id: string) => void;
  onMoveSupport: (id: string, x: number, z: number) => void;
}
function Roof({ roof }: { roof: RoofImage }) {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    setTexture(null);
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
  hardware,
  pickBrace,
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
  hardware: boolean;
  pickBrace?: () => void;
}) {
  const group = useRef<Group>(null),
    drag = useRef<{ x: number; z: number } | null>(null),
    baseY = bed.bases ? bed.baseHeight : 0;
  const point = (e: ThreeEvent<PointerEvent>) => {
    const p = e.ray.intersectPlane(
      new Plane(new Vector3(0, 1, 0), -baseY),
      new Vector3(),
    );
    return p && group.current?.parent
      ? group.current.parent.worldToLocal(p)
      : null;
  };
  const release = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = null;
    onDragging(false);
    (
      e.target as unknown as { releasePointerCapture: (id: number) => void }
    ).releasePointerCapture(e.pointerId);
  };
  return (
    <group
      ref={group}
      onClick={(e) => {
        if (pickBrace) {
          e.stopPropagation();
          pickBrace();
        } else if (enabled) {
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
          args={[
            enabled || pickBrace ? 0.105 : 0.055,
            leg.length,
            enabled || pickBrace ? 0.105 : 0.055,
          ]}
        />
        <meshStandardMaterial
          color={selected ? "#739d42" : enabled ? "#547d66" : "#aebbb9"}
          metalness={0.65}
          roughness={0.3}
        />
      </mesh>
      {hardware && (
        <>
          <Connector
            type={leg.bottomHardware}
            position={[leg.x, 0.02, leg.z]}
            bolts={leg.bottomHardware === "lFoot" ? 1 : 2}
          />
          <Connector
            type={leg.topHardware}
            position={[leg.x, leg.length - 0.07, leg.z]}
            rotation={[dimensions(bed).rad, 0, 0]}
            bolts={leg.topHardware === "lFoot" ? 1 : 2}
          />
        </>
      )}
      {(selected || measure) && (
        <DimensionLabel
          position={[leg.x, leg.length + 0.15, leg.z]}
          text={`P-${String(index + 1).padStart(2, "0")} · ${leg.length.toFixed(3)} m`}
        />
      )}
    </group>
  );
}
function BraceBeam({
  from,
  to,
  axis,
  hardware,
}: {
  from: [number, number, number];
  to: [number, number, number];
  axis: "ew" | "ns";
  hardware: boolean;
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
    <>
      <mesh position={center} quaternion={rotation} castShadow>
        <boxGeometry args={[0.045, delta.length(), 0.045]} />
        <meshStandardMaterial
          color="#7b9b83"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      {hardware && (
        <>
          <Connector
            type={axis === "ew" ? "lFoot" : "tiltPlate"}
            position={from}
            bolts={2}
          />
          <Connector
            type={axis === "ew" ? "lFoot" : "tiltPlate"}
            position={to}
            bolts={2}
          />
        </>
      )}
    </>
  );
}
function Structure({
  bed,
  measure,
  onToggle,
  mode,
  selectedPanel,
  selectedSupport,
  selectedRail,
  onSelectRail,
  onSelectPanel,
  onSelectSupport,
  onMoveSupport,
  onDragging,
  active,
  onActivate,
  hardware,
  showPanels,
  braceFirst,
  onBracePick,
}: {
  bed: Bed;
  measure: boolean;
  onToggle: (r: number, c: number) => void;
  onDragging: (v: boolean) => void;
  active: boolean;
  onActivate: () => void;
  hardware: boolean;
  showPanels: boolean;
  braceFirst: string;
  onBracePick: (id: string) => void;
} & EditingProps) {
  const d = dimensions(bed),
    legs = supports(bed),
    baseY = bed.bases ? bed.baseHeight : 0,
    tracks = supportTracks(bed);
  return (
    <group position={[0, baseY, 0]}>
      {legs.map((leg, index) => (
        <Leg
          key={leg.id}
          bed={bed}
          leg={leg}
          hardware={hardware && active}
          measure={measure && active}
          index={index}
          enabled={active && mode === "support"}
          selected={
            active &&
            ((mode === "support" && leg.id === selectedSupport) ||
              (mode === "brace" && leg.id === braceFirst))
          }
          onSelect={() => onSelectSupport(leg.id)}
          onMove={(x, z) => onMoveSupport(leg.id, x, z)}
          onDragging={onDragging}
          pickBrace={
            active && mode === "brace" ? () => onBracePick(leg.id) : undefined
          }
        />
      ))}
      <group position={[0, bed.frontHeight, d.frontZ]} rotation={[d.rad, 0, 0]}>
        <group visible={showPanels}>
          {Array.from({ length: bed.rows }, (_, r) =>
            Array.from({ length: bed.columns }, (_, c) => (
              <group
                key={panelKey(r, c)}
                position={[d.rowColumnCenters[r][c], 0, -d.rowCenters[r]]}
                rotation={[0, (panelRotation(bed, r, c) * Math.PI) / 180, 0]}
              >
                <Panel
                  detailed={active}
                  w={d.w}
                  l={d.l}
                  removed={!isActive(bed, r, c)}
                  interactive={
                    showPanels &&
                    (active
                      ? mode === "panel" || mode === "remove"
                      : mode !== "brace")
                  }
                  selected={
                    active &&
                    mode === "panel" &&
                    selectedPanel === panelKey(r, c)
                  }
                  onClick={() => {
                    if (!active) {
                      onActivate();
                      return;
                    }
                    if (mode === "remove") onToggle(r, c);
                    else if (mode === "panel") onSelectPanel(r, c);
                  }}
                />
              </group>
            )),
          )}
        </group>
        {tracks
          .filter((t) => t.axis === "x")
          .map((t) => {
            const distance = (d.frontZ - t.fixed) / Math.cos(d.rad);
            return (
              <group key={t.id}>
                <mesh
                  onClick={(e) => {
                    if (mode !== "rail") return;
                    e.stopPropagation();
                    if (active) onSelectRail(t.id);
                    else onActivate();
                  }}
                  position={[(t.start + t.end) / 2, -0.065, -distance]}
                  castShadow
                >
                  <boxGeometry
                    args={[t.end - t.start + 2 * bed.overhang, 0.09, 0.06]}
                  />
                  <meshStandardMaterial
                    color={
                      active && mode === "rail" && selectedRail === t.id
                        ? "#7eae52"
                        : "#bfc7c5"
                    }
                    metalness={0.7}
                    roughness={0.28}
                  />
                </mesh>
              </group>
            );
          })}
        {hardware &&
          active &&
          panelClamps(bed).map((c) => (
            <group
              key={c.id}
              position={[c.x, 0.05, -c.distance]}
              rotation={[0, c.axis === "z" ? Math.PI / 2 : 0, 0]}
            >
              <Clamp position={[0, 0, 0]} end={c.end} />
            </group>
          ))}
      </group>
      {tracks
        .filter((t) => t.axis === "z")
        .map((t) => {
          const distance = (d.frontZ - (t.start + t.end) / 2) / Math.cos(d.rad),
            length =
              (t.end - t.start) / Math.cos(d.rad) +
              (t.panelMount ? 2 * bed.overhang : 0);
          return (
            <mesh
              key={t.id}
              onClick={(e) => {
                if (mode !== "rail") return;
                e.stopPropagation();
                if (active) onSelectRail(t.id);
                else onActivate();
              }}
              position={[
                t.fixed,
                bed.frontHeight +
                  distance * Math.sin(d.rad) -
                  (t.panelMount ? 0.065 : 0.15),
                (t.start + t.end) / 2,
              ]}
              rotation={[d.rad, 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.06, 0.07, length]} />
              <meshStandardMaterial
                color={
                  active && mode === "rail" && selectedRail === t.id
                    ? "#7eae52"
                    : "#929f9d"
                }
                metalness={0.6}
              />
            </mesh>
          );
        })}
      {hardware &&
        active &&
        tracks
          .filter((t) => t.axis === "x")
          .flatMap((ew) =>
            tracks
              .filter(
                (ns) =>
                  ns.axis === "z" &&
                  ns.fixed >= ew.start - 1e-6 &&
                  ns.fixed <= ew.end + 1e-6 &&
                  ew.fixed >= ns.start - 1e-6 &&
                  ew.fixed <= ns.end + 1e-6,
              )
              .map((ns) => (
                <mesh
                  key={`${ew.id}-${ns.id}`}
                  position={[
                    ns.fixed,
                    bed.frontHeight +
                      (d.frontZ - ew.fixed) * Math.tan(d.rad) -
                      0.1,
                    ew.fixed,
                  ]}
                >
                  <boxGeometry args={[0.13, 0.025, 0.13]} />
                  <meshStandardMaterial color="#8ca099" metalness={0.7} />
                </mesh>
              )),
          )}
      {braces(bed).map((c) => (
        <BraceBeam
          key={c.id}
          from={c.from}
          to={c.to}
          axis={c.axis}
          hardware={hardware && active}
        />
      ))}
      {measure && active && (
        <>
          <Line
            points={[
              [d.minX, 0, d.frontZ + 0.8],
              [d.maxX, 0, d.frontZ + 0.8],
            ]}
            color="#46745c"
            lineWidth={1.5}
          />
          <DimensionLabel
            position={[d.centerX, 0, d.frontZ + 1]}
            text={`${d.width.toFixed(2)} m`}
          />
          <DimensionLabel
            position={[d.maxX + 0.5, d.rearHeight / 2, d.backZ]}
            text={`H ${d.rearHeight.toFixed(2)} m`}
          />
        </>
      )}
    </group>
  );
}
function BedGroup({
  pose,
  children,
  enabled,
  onSelect,
  onMove,
  onDragging,
}: {
  pose: { x: number; z: number; rotation: number };
  children: ReactNode;
  enabled: boolean;
  onSelect: () => void;
  onMove: (x: number, z: number) => void;
  onDragging: (v: boolean) => void;
}) {
  const drag = useRef<{ x: number; z: number } | null>(null);
  const plane = new Plane(new Vector3(0, 1, 0), 0);
  return (
    <group
      position={[pose.x, 0, pose.z]}
      rotation={[0, (-pose.rotation * Math.PI) / 180, 0]}
      onPointerDown={(e) => {
        if (!enabled || e.button !== 0) return;
        e.stopPropagation();
        const p = e.ray.intersectPlane(plane, new Vector3());
        if (!p) return;
        drag.current = { x: pose.x - p.x, z: pose.z - p.z };
        onSelect();
        onDragging(true);
        (
          e.target as unknown as { setPointerCapture: (n: number) => void }
        ).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        e.stopPropagation();
        const p = e.ray.intersectPlane(plane, new Vector3());
        if (p) onMove(p.x + drag.current.x, p.z + drag.current.z);
      }}
      onPointerUp={(e) => {
        if (!drag.current) return;
        e.stopPropagation();
        drag.current = null;
        onDragging(false);
        (
          e.target as unknown as { releasePointerCapture: (n: number) => void }
        ).releasePointerCapture(e.pointerId);
      }}
    >
      {children}
    </group>
  );
}
export default function Scene({
  bed,
  project,
  onToggle,
  mode,
  onModeChange,
  selectedPanel,
  selectedSupport,
  selectedRail,
  onSelectRail,
  onSelectPanel,
  onSelectSupport,
  onMoveSupport,
  onSelectBed,
  onMoveBed,
  braceFirst,
  onBracePick,
}: {
  bed: Bed;
  project: Project;
  onToggle: (r: number, c: number) => void;
  onModeChange: (m: EditMode) => void;
  onSelectBed: (id: string) => void;
  onMoveBed: (id: string, x: number, z: number) => void;
  braceFirst: string;
  onBracePick: (id: string) => void;
} & EditingProps) {
  const [dragging, setDragging] = useState(false),
    [measure, setMeasure] = useState(false),
    [view, setView] = useState("iso"),
    [reset, setReset] = useState(0),
    [rotate, setRotate] = useState(false),
    [pan, setPan] = useState(false),
    [hardware, setHardware] = useState(true),
    [structureOnly, setStructureOnly] = useState(false);
  useEffect(() => {
    if (mode !== "navigate") setPan(false);
  }, [mode]);
  const root = useRef<HTMLDivElement>(null);
  const fit = useMemo(
    () => projectBounds(project),
    [reset, project.beds.length],
  );
  const target = useMemo(
    () => new Vector3(fit.centerX, 0.5, fit.centerZ),
    [fit],
  );
  const setMode = (m: EditMode) => {
    setPan(false);
    setDragging(false);
    onModeChange(m);
  };
  return (
    <div
      className="scene"
      ref={root}
      data-fit-x={fit.centerX}
      data-fit-z={fit.centerZ}
      data-fit-span={fit.span}
    >
      <div className="scene-top">
        <span className="view-badge">
          <span /> {project.beds.length}{" "}
          {project.beds.length === 1 ? "CAMA" : "CAMAS"} EN EL PROYECTO
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
            ["navigate", "Navegar"],
            ["panel", "Girar paneles"],
            ["support", "Mover patas"],
            ["rail", "Editar rieles"],
            ["brace", "Contravientos"],
            ["bed", "Mover camas"],
            ["remove", "Quitar paneles"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            aria-label={`${label} en 3D`}
            className={mode === v && !pan ? "active" : ""}
            onClick={() => setMode(v)}
          >
            {label}
          </button>
        ))}
      </div>
      {project.beds.length > 1 && (
        <div className="scene-bedlist" aria-label="Camas visibles en el techo">
          {project.beds.map((b) => (
            <button
              key={b.id}
              className={`bed-scene-label ${b.id === bed.id ? "active" : ""}`}
              onClick={() => onSelectBed(b.id)}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
      <SceneBoundary>
        <Suspense
          fallback={<div className="scene-fallback">Preparando modelo 3D…</div>}
        >
          <Canvas
            shadows
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            camera={{ position: [10, 9, 13], fov: 38, near: 0.1, far: 1500 }}
            dpr={[1, 1.5]}
            onCreated={({ gl }) => gl.setClearColor("#edf0e9")}
          >
            <Camera
              view={view}
              span={fit.span}
              center={[fit.centerX, 0.5, fit.centerZ]}
              revision={reset}
            />
            <ambientLight intensity={1.7} />
            <directionalLight
              position={[8, 15, 6]}
              intensity={3}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-left={-30}
              shadow-camera-right={30}
              shadow-camera-top={30}
              shadow-camera-bottom={-30}
              shadow-bias={-0.0004}
            />
            {project.roof && <Roof roof={project.roof} />}
            {project.beds.map((b, i) => {
              const pose = bedPose(project, i),
                active = b.id === bed.id,
                d = dimensions(b);
              return (
                <BedGroup
                  key={b.id}
                  pose={pose}
                  enabled={!pan && mode === "bed"}
                  onSelect={() => onSelectBed(b.id)}
                  onMove={(x, z) => onMoveBed(b.id, x, z)}
                  onDragging={setDragging}
                >
                  <Structure
                    bed={b}
                    active={active}
                    mode={pan ? "navigate" : mode}
                    onActivate={() => onSelectBed(b.id)}
                    measure={measure}
                    hardware={hardware}
                    showPanels={!structureOnly}
                    onToggle={onToggle}
                    selectedPanel={selectedPanel}
                    selectedSupport={selectedSupport}
                    selectedRail={selectedRail}
                    onSelectRail={onSelectRail}
                    onSelectPanel={onSelectPanel}
                    onSelectSupport={onSelectSupport}
                    onMoveSupport={onMoveSupport}
                    onDragging={setDragging}
                    braceFirst={braceFirst}
                    onBracePick={onBracePick}
                  />
                </BedGroup>
              );
            })}
            <Grid
              position={[0, -0.015, 0]}
              args={[400, 400]}
              cellSize={1}
              cellThickness={0.45}
              cellColor="#c8d0c3"
              sectionSize={5}
              sectionThickness={0.65}
              sectionColor="#b7c1b1"
              fadeDistance={80}
              fadeStrength={1.5}
              infiniteGrid
            />
            <ContactShadows
              position={[fit.centerX, -0.01, fit.centerZ]}
              opacity={0.25}
              scale={Math.max(50, fit.span * 2)}
              blur={2}
              far={6}
              resolution={256}
            />
            <OrbitControls
              makeDefault
              target={target}
              enabled={!dragging}
              autoRotate={rotate && !dragging}
              autoRotateSpeed={0.6}
              enablePan
              screenSpacePanning={false}
              mouseButtons={{
                LEFT: pan ? MOUSE.PAN : MOUSE.ROTATE,
                MIDDLE: MOUSE.DOLLY,
                RIGHT: MOUSE.PAN,
              }}
              touches={{
                ONE: pan ? TOUCH.PAN : TOUCH.ROTATE,
                TWO: TOUCH.DOLLY_PAN,
              }}
              minDistance={2}
              maxDistance={Math.max(
                100,
                fit.span * 4,
                (project.roof?.width ?? 0) * 3,
                (project.roof?.length ?? 0) * 3,
              )}
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
          <MousePointer2 size={14} />
          {pan
            ? "Arrastra para desplazar la vista"
            : mode === "bed"
              ? "Arrastra una cama para acomodarla"
              : mode === "brace"
                ? "Selecciona dos patas alineadas"
                : mode === "support"
                  ? "Arrastra la pata sobre su riel"
                  : "Arrastra para girar · Rueda para zoom · Botón derecho para desplazar"}
        </span>
        <div className="scene-tools">
          <button
            title="Desplazar vista"
            className={pan ? "active" : ""}
            onClick={() => {
              setPan(!pan);
              onModeChange("navigate");
            }}
          >
            <Move size={18} />
          </button>
          <button
            title="Girar automáticamente"
            className={rotate ? "active" : ""}
            onClick={() => setRotate(!rotate)}
          >
            <Move3D size={18} />
          </button>
          <button
            title="Mostrar sólo estructura"
            aria-pressed={structureOnly}
            className={structureOnly ? "active" : ""}
            onClick={() => setStructureOnly(!structureOnly)}
          >
            <Layers size={18} />
          </button>
          <button
            title="Mostrar herrajes"
            className={hardware ? "active" : ""}
            onClick={() => setHardware(!hardware)}
          >
            <Wrench size={18} />
          </button>
          <button
            title="Mostrar medidas"
            className={measure ? "active" : ""}
            onClick={() => setMeasure(!measure)}
          >
            <Ruler size={18} />
          </button>
          <button
            title="Encuadrar proyecto"
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
