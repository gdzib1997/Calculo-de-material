import { validRasterDataUrl } from "./image-format";
export type MaterialId =
  | "rail"
  | "railEW"
  | "railNS"
  | "splice"
  | "midClamp"
  | "endClamp"
  | "beamClip"
  | "tiltPlate"
  | "lFoot"
  | "tBolt"
  | "ground"
  | "concrete"
  | "leg";
export interface PanelPreset {
  id: string;
  name: string;
  width: number;
  length: number;
}
export const DEFAULT_PANEL: PanelPreset = {
  id: "panel-default",
  name: "Panel 2.38 × 1.14 m",
  width: 1.14,
  length: 2.38,
};
export interface Point2 {
  x: number;
  y: number;
}
export interface RoofReference {
  id: string;
  from: Point2;
  to: Point2;
  distance: number;
}
export interface BraceConnection {
  id: string;
  fromId: string;
  toId: string;
  axis: "ew" | "ns";
  reverse?: boolean;
}
export interface RoofImage {
  dataUrl: string;
  name: string;
  width: number;
  length: number;
  x: number;
  z: number;
  rotation: number;
  opacity: number;
  imageAspect?: number;
  references?: RoofReference[];
}
export type LegHardware = "lFoot" | "tiltPlate" | "none";
export interface SupportPosition {
  x: number;
  z: number;
  trackId?: string;
  bottomHardware?: LegHardware;
  topHardware?: LegHardware;
}
export interface Bed {
  id: string;
  name: string;
  rows: number;
  columns: number;
  position?: { x: number; z: number };
  azimuth?: number;
  manualBraces?: BraceConnection[];
  removed: string[];
  angle: number;
  panelWidth: number;
  panelLength: number;
  gap: number;
  orientation: "portrait" | "landscape";
  frontHeight: number;
  overhang: number;
  railLength: number;
  referenceRailLength: number;
  supportSpacing: number;
  supportSpacingNS?: number;
  nsMode?: "auto" | "include" | "exclude";
  beamClipsPerCrossing?: number;
  bracingEnabled?: boolean;
  bracingCount?: number;
  bracingAxis?: "ew" | "ns";
  bracingLength?: number;
  supportOverrides?: Record<string, SupportPosition>;
  panelRotations?: Record<string, number>;
  bases: boolean;
  baseWidth: number;
  baseDepth: number;
  baseHeight: number;
  panelPresetId?: string;
  overrides: Partial<Record<MaterialId, number>>;
}
export interface Project {
  version: 1;
  name: string;
  customer: string;
  beds: Bed[];
  updatedAt: string;
  prices?: Partial<Record<MaterialId, number>>;
  panelLibrary?: PanelPreset[];
  roof?: RoofImage;
}
export interface Material {
  id: MaterialId;
  name: string;
  unit: string;
  calculated: number;
  quantity: number;
  overridden: boolean;
}
export const MATERIALS: { id: MaterialId; name: string; unit: string }[] = [
  { id: "rail", name: "Riel (total)", unit: "pza" },
  { id: "splice", name: "Empalme · Splice", unit: "pza" },
  { id: "midClamp", name: "Abrazadera intermedia · Mid Clamp", unit: "pza" },
  { id: "endClamp", name: "Abrazadera final · End Clamp", unit: "pza" },
  { id: "beamClip", name: "Beam Clip", unit: "pza" },
  { id: "tiltPlate", name: "Tilt Plate", unit: "pza" },
  { id: "lFoot", name: "L-Foot", unit: "pza" },
  { id: "tBolt", name: "T-Bolt", unit: "pza" },
  { id: "ground", name: "Puesta a tierra · Tierras", unit: "pza" },
  { id: "concrete", name: "Bloque de concreto sólido", unit: "pza" },
  { id: "leg", name: "Pata · perfil vertical", unit: "pza" },
];
// Transcripción de la imagen del usuario. No constituye una especificación del fabricante.
const SINGLE = {
  railEW: [4, 6, 7, 8, 10, 11, 13, 14, 16],
  splice: [0, 0, 0, 2, 2, 2, 2, 4, 4],
  midClamp: [2, 4, 6, 8, 10, 12, 14, 16, 18],
  endClamp: [4, 4, 4, 4, 4, 4, 4, 4, 4],
  beamClip: [4, 6, 6, 8, 10, 12, 12, 14, 14],
  tiltPlate: [8, 12, 12, 16, 20, 24, 24, 28, 28],
  lFoot: [6, 10, 10, 12, 14, 14, 18, 18, 22],
  tBolt: [26, 40, 40, 52, 62, 62, 72, 72, 94],
  ground: [1, 1, 1, 1, 1, 1, 1, 1, 1],
};
const DOUBLE = {
  railEW: [7, 10, 13, 16, 19, 21, 24, 26, 28],
  splice: [0, 0, 0, 4, 4, 4, 4, 8, 8],
  midClamp: [4, 8, 12, 16, 20, 24, 28, 32, 36],
  endClamp: [8, 8, 8, 8, 8, 8, 8, 8, 8],
  beamClip: [8, 12, 12, 16, 20, 20, 24, 24, 28],
  tiltPlate: [10, 15, 15, 20, 25, 25, 30, 30, 35],
  lFoot: [10, 13, 13, 16, 19, 19, 24, 24, 28],
  tBolt: [30, 46, 60, 60, 80, 80, 100, 100, 120],
  ground: [1, 1, 1, 1, 1, 1, 1, 1, 1],
};
export const EW_REFERENCE_SPACING = [
  1.4, 1.25, 1.85, 1.61, 1.52, 1.78, 1.66, 1.89, 1.76,
];
export function createBed(index = 1): Bed {
  return {
    id: crypto.randomUUID(),
    name: `Cama ${String(index).padStart(2, "0")}`,
    rows: 2,
    columns: 6,
    removed: [],
    manualBraces: [],
    angle: 15,
    panelWidth: 1.14,
    panelLength: 2.38,
    gap: 0.02,
    orientation: "portrait",
    frontHeight: 0.45,
    overhang: 0.05,
    railLength: 4.7,
    referenceRailLength: 4.7,
    supportSpacing: 1.52,
    supportSpacingNS: 1.5,
    nsMode: "auto",
    beamClipsPerCrossing: 1,
    bracingEnabled: false,
    bracingCount: 2,
    bracingAxis: "ew",
    panelPresetId: DEFAULT_PANEL.id,
    bases: true,
    baseWidth: 0.5,
    baseDepth: 0.5,
    baseHeight: 0.2,
    overrides: {},
  };
}
export function createProject(): Project {
  return {
    version: 1,
    name: "Proyecto solar",
    customer: "",
    panelLibrary: [{ ...DEFAULT_PANEL }],
    beds: [{ ...createBed(), position: { x: 0, z: 0 }, azimuth: 0 }],
    updatedAt: new Date().toISOString(),
  };
}
export const panelKey = (r: number, c: number) => `${r}:${c}`;
export function isActive(b: Bed, r: number, c: number) {
  return (
    r >= 0 &&
    c >= 0 &&
    r < b.rows &&
    c < b.columns &&
    !b.removed.includes(panelKey(r, c))
  );
}
export function panelRotation(b: Bed, r: number, c: number) {
  return b.panelRotations?.[panelKey(r, c)] ?? 0;
}
export function dimensions(b: Bed) {
  const w = b.orientation === "portrait" ? b.panelWidth : b.panelLength,
    l = b.orientation === "portrait" ? b.panelLength : b.panelWidth;
  const extents = (r: number, c: number) => {
    const a = (panelRotation(b, r, c) * Math.PI) / 180;
    return {
      w: Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * l,
      l: Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * l,
    };
  };
  const rowColumnWidths = Array.from({ length: b.rows }, (_, r) =>
    Array.from({ length: b.columns }, (_, c) => extents(r, c).w),
  );
  const rowLengths = Array.from({ length: b.rows }, (_, r) =>
    Math.max(...Array.from({ length: b.columns }, (_, c) => extents(r, c).l)),
  );
  const centers = (values: number[]) =>
    values.map(
      (v, i) =>
        values.slice(0, i).reduce((a, n) => a + n, 0) + i * b.gap + v / 2,
    );
  const nominalWidth = b.columns * w + (b.columns - 1) * b.gap,
    nominalLength = b.rows * l + (b.rows - 1) * b.gap;
  const minX = -nominalWidth / 2;
  const rowWidths = rowColumnWidths.map(
    (values) => values.reduce((a, n) => a + n, 0) + (b.columns - 1) * b.gap,
  );
  const rowColumnCenters = rowColumnWidths.map((values) =>
    centers(values).map((x) => x + minX),
  );
  const rowCenters = centers(rowLengths),
    width = Math.max(...rowWidths),
    length = rowLengths.reduce((a, n) => a + n, 0) + (b.rows - 1) * b.gap,
    rad = (b.angle * Math.PI) / 180;
  const frontZ = (nominalLength * Math.cos(rad)) / 2,
    backZ = frontZ - length * Math.cos(rad),
    maxX = minX + width;
  return {
    w,
    l,
    width,
    length,
    rad,
    minX,
    maxX,
    frontZ,
    backZ,
    centerX: (minX + maxX) / 2,
    centerZ: (frontZ + backZ) / 2,
    rowWidths,
    rowColumnWidths,
    rowColumnCenters,
    rowLengths,
    rowCenters,
    columnWidths: rowColumnWidths[0],
    columnCenters: rowColumnCenters[0],
    depth: length * Math.cos(rad),
    rearHeight: b.frontHeight + length * Math.sin(rad),
  };
}
export function panelPlacement(b: Bed, r: number, c: number) {
  const d = dimensions(b);
  return {
    x: d.rowColumnCenters[r][c],
    z: d.frontZ - d.rowCenters[r] * Math.cos(d.rad),
    distance: d.rowCenters[r],
    y: b.frontHeight + d.rowCenters[r] * Math.sin(d.rad),
  };
}
export function rowRunBounds(
  b: Bed,
  row: number,
  first: number,
  count: number,
) {
  const d = dimensions(b);
  return {
    startX: d.rowColumnCenters[row][first] - d.rowColumnWidths[row][first] / 2,
    width:
      d.rowColumnWidths[row]
        .slice(first, first + count)
        .reduce((a, n) => a + n, 0) +
      (count - 1) * b.gap,
  };
}
export function sectionDimensions(b: Bed, section: Section) {
  const d = dimensions(b);
  const rows = Array.from({ length: section.rows }, (_, i) =>
    rowRunBounds(b, section.row + i, section.column, section.columns),
  );
  const startX = Math.max(...rows.map((r) => r.startX)),
    endX = Math.min(...rows.map((r) => r.startX + r.width));
  return {
    width: Math.max(0, endX - startX),
    startX,
    length:
      d.rowLengths
        .slice(section.row, section.row + section.rows)
        .reduce((a, n) => a + n, 0) +
      (section.rows - 1) * b.gap,
    startDistance: d.rowCenters[section.row] - d.rowLengths[section.row] / 2,
  };
}
export function bedPose(project: Project, index: number) {
  const b = project.beds[index];
  return {
    x:
      b.position?.x ??
      project.beds
        .slice(0, index)
        .reduce((n, v) => n + dimensions(v).width + 2, 0),
    z: b.position?.z ?? 0,
    rotation: b.azimuth ?? 0,
  };
}
export function projectBounds(project: Project) {
  const points = project.beds.flatMap((b, i) => {
    const d = dimensions(b),
      p = bedPose(project, i),
      a = (p.rotation * Math.PI) / 180;
    return [d.minX, d.maxX].flatMap((x) =>
      [d.backZ, d.frontZ].map((z) => ({
        x: p.x + x * Math.cos(a) - z * Math.sin(a),
        z: p.z + x * Math.sin(a) + z * Math.cos(a),
      })),
    );
  });
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x)),
    minZ = Math.min(...points.map((p) => p.z)),
    maxZ = Math.max(...points.map((p) => p.z));
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    span: Math.max(maxX - minX, maxZ - minZ, 5),
  };
}
export function calibrateRoof(
  roof: RoofImage,
  references: RoofReference[],
): RoofImage {
  if (references.length < 1 || references.length > 2)
    throw new Error("Usa una o dos medidas de referencia.");
  const terms = references.map((r) => ({
    a: (r.to.x - r.from.x) ** 2,
    b: (r.to.y - r.from.y) ** 2,
    c: r.distance ** 2,
  }));
  let width: number, length: number;
  if (terms.some((t) => t.a + t.b < 1e-8 || t.c <= 0))
    throw new Error("Selecciona dos puntos distintos y una medida positiva.");
  if (terms.length === 1) {
    const aspect = roof.imageAspect ?? roof.width / roof.length,
      t = terms[0];
    width = Math.sqrt(t.c / (t.a + t.b / aspect ** 2));
    length = width / aspect;
  } else {
    const [a, b] = terms,
      det = a.a * b.b - b.a * a.b;
    if (Math.abs(det) < 1e-10)
      throw new Error(
        "Las referencias no permiten calcular ambos ejes. Elige una más horizontal y otra más vertical.",
      );
    const w2 = (a.c * b.b - b.c * a.b) / det,
      l2 = (a.a * b.c - b.a * a.c) / det;
    if (w2 <= 0 || l2 <= 0)
      throw new Error(
        "Las medidas de referencia no son compatibles. Revisa puntos y distancias.",
      );
    width = Math.sqrt(w2);
    length = Math.sqrt(l2);
  }
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(length) ||
    width < 0.5 ||
    length < 0.5 ||
    width > 200 ||
    length > 200
  )
    throw new Error(
      "La escala queda fuera del rango de 0.5 a 200 m. Revisa las referencias.",
    );
  return { ...roof, width, length, references };
}
export function supportLines(b: Bed, row: number) {
  const d = dimensions(b),
    length = d.rowLengths[row],
    center = d.rowCenters[row];
  const distance =
    b.supportSpacingNS === undefined
      ? length * 0.6
      : Math.min(
          b.supportSpacingNS,
          Math.max(0.05, length * Math.cos(d.rad) - 0.1),
        ) / Math.cos(d.rad);
  return [center - distance / 2, center + distance / 2];
}
export function activeCount(b: Bed) {
  let n = 0;
  for (let r = 0; r < b.rows; r++)
    for (let c = 0; c < b.columns; c++) if (isActive(b, r, c)) n++;
  return n;
}
export interface Section {
  row: number;
  column: number;
  rows: number;
  columns: number;
}
// Descompone formas irregulares en tramos contiguos de una o dos filas.
export function sections(b: Bed): Section[] {
  const result: Section[] = [];
  const used = new Set<string>();
  for (let r = 0; r < b.rows; r++)
    for (let c = 0; c < b.columns; c++) {
      if (!isActive(b, r, c) || used.has(panelKey(r, c))) continue;
      const height =
        isActive(b, r + 1, c) && !used.has(panelKey(r + 1, c)) ? 2 : 1;
      let width = 0;
      while (c + width < b.columns && width < 10) {
        let fits = true;
        for (let rr = 0; rr < height; rr++)
          if (
            !isActive(b, r + rr, c + width) ||
            used.has(panelKey(r + rr, c + width))
          )
            fits = false;
        // No unir una fila sencilla a la parte superior de un tramo doble nuevo.
        if (
          height === 1 &&
          isActive(b, r + 1, c + width) &&
          !used.has(panelKey(r + 1, c + width))
        )
          fits = false;
        if (!fits) break;
        width++;
      }
      if (width === 0) width = 1;
      for (let rr = 0; rr < height; rr++)
        for (let cc = 0; cc < width; cc++) used.add(panelKey(r + rr, c + cc));
      result.push({ row: r, column: c, rows: height, columns: width });
    }
  return result;
}
export function referenceQuantity(rows: number, columns: number) {
  if (columns >= 2 && columns <= 10) {
    const table = rows === 2 ? DOUBLE : SINGLE;
    return Object.fromEntries(
      Object.entries(table).map(([key, values]) => [key, values[columns - 2]]),
    ) as Partial<Record<MaterialId, number>>;
  }
  // Un panel aislado no aparece en la tabla: estimación explícita.
  return {
    railEW: 2 * rows,
    splice: 0,
    midClamp: 0,
    endClamp: 4 * rows,
    beamClip: 4 * rows,
    tiltPlate: 8 * rows,
    lFoot: 4 * rows,
    tBolt: 16 * rows,
    ground: 1,
  };
}
export interface SupportTrack {
  id: string;
  axis: "x" | "z";
  start: number;
  end: number;
  fixed: number;
  row?: number;
  line?: number;
  runFirst?: number;
  name: string;
}
export function supportTracks(b: Bed): SupportTrack[] {
  const d = dimensions(b),
    tracks: SupportTrack[] = [];
  for (let r = 0; r < b.rows; r++) {
    let c = 0;
    while (c < b.columns) {
      if (!isActive(b, r, c)) {
        c++;
        continue;
      }
      const first = c;
      while (c < b.columns && isActive(b, r, c)) c++;
      const bounds = rowRunBounds(b, r, first, c - first);
      for (const [line, distance] of supportLines(b, r).entries())
        tracks.push({
          id: `ew:r${r}:c${first}:n${line}`,
          axis: "x",
          start: bounds.startX,
          end: bounds.startX + bounds.width,
          fixed: d.frontZ - distance * Math.cos(d.rad),
          row: r,
          line,
          runFirst: first,
          name: `E–O · fila ${r + 1} · línea ${line + 1}`,
        });
    }
  }
  for (const [i, section] of northSouthSections(b).entries()) {
    const q = sectionDimensions(b, section);
    if (q.width <= 0) continue;
    const n = Math.ceil(q.width / b.supportSpacing) + 1;
    for (let c = 0; c < n; c++)
      tracks.push({
        id: `ns:${section.row}:${section.column}:${i}:${c}`,
        axis: "z",
        start: d.frontZ - (q.startDistance + q.length) * Math.cos(d.rad),
        end: d.frontZ - q.startDistance * Math.cos(d.rad),
        fixed: q.startX + (c * q.width) / (n - 1),
        name: `N–S · tramo ${i + 1} · línea ${c + 1}`,
      });
  }
  return tracks;
}
export interface Support {
  id: string;
  x: number;
  z: number;
  length: number;
  row: number;
  line: number;
  slot: number;
  runFirst: number;
  autoX: number;
  autoZ: number;
  moved: boolean;
  constrained: boolean;
  trackId: string;
  axis: "x" | "z";
  bottomHardware: LegHardware;
  topHardware: LegHardware;
}
export function supports(b: Bed): Support[] {
  const d = dimensions(b),
    tracks = supportTracks(b),
    result: Support[] = [];
  for (const rail of tracks.filter((t) => t.axis === "x")) {
    const r = rail.row!,
      first = rail.runFirst!,
      line = rail.line!,
      span = rail.end - rail.start,
      inset = Math.min(0.2, span / 4),
      available = span - 2 * inset,
      n = Math.max(2, Math.ceil(available / b.supportSpacing) + 1);
    for (let i = 0; i < n; i++) {
      const id = `r${r}:c${first}:s${i}:n${line}`,
        autoX = rail.start + inset + (available * i) / (n - 1),
        autoZ = rail.fixed,
        manual = b.supportOverrides?.[id];
      const track = tracks.find((t) => t.id === manual?.trackId) || rail;
      const x =
        track.axis === "x"
          ? Math.max(track.start, Math.min(track.end, manual?.x ?? autoX))
          : track.fixed;
      const z =
        track.axis === "z"
          ? Math.max(track.start, Math.min(track.end, manual?.z ?? autoZ))
          : track.fixed;
      result.push({
        id,
        x,
        z,
        autoX,
        autoZ,
        row: r,
        line,
        slot: i,
        runFirst: first,
        moved: !!manual,
        trackId: track.id,
        axis: track.axis,
        bottomHardware: manual?.bottomHardware ?? "lFoot",
        topHardware: manual?.topHardware ?? "tiltPlate",
        constrained:
          !!manual &&
          (Math.abs(x - manual.x) > 1e-7 || Math.abs(z - manual.z) > 1e-7),
        length: b.frontHeight + (d.frontZ - z) * Math.tan(d.rad),
      });
    }
  }
  // Preserva el orden histórico: fila, tramo, estación y línea.
  return result.sort(
    (a, c) =>
      a.row - c.row ||
      a.runFirst - c.runFirst ||
      a.slot - c.slot ||
      a.line - c.line,
  );
}
export function snapSupport(
  b: Bed,
  id: string,
  x: number,
  z: number,
  trackId?: string,
): SupportPosition {
  const leg = supports(b).find((s) => s.id === id);
  if (!leg) throw new Error("La pata ya no existe.");
  const t = supportTracks(b).find((t) => t.id === (trackId ?? leg.trackId));
  if (!t) throw new Error("El riel ya no existe.");
  return {
    ...b.supportOverrides?.[id],
    trackId: t.id,
    x: t.axis === "x" ? Math.max(t.start, Math.min(t.end, x)) : t.fixed,
    z: t.axis === "z" ? Math.max(t.start, Math.min(t.end, z)) : t.fixed,
  };
}
export function supportNeighbours(b: Bed, id: string) {
  const all = supports(b),
    s = all.find((v) => v.id === id);
  if (!s) return { previous: undefined, opposite: undefined };
  const previous = all
    .filter(
      (v) =>
        v.trackId === s.trackId &&
        (s.axis === "x" ? v.x < s.x - 0.001 : v.z < s.z - 0.001),
    )
    .sort((a, b) => (s.axis === "x" ? b.x - a.x : b.z - a.z))[0];
  return {
    previous,
    opposite: all.find(
      (v) =>
        v.row === s.row &&
        v.runFirst === s.runFirst &&
        v.slot === s.slot &&
        v.line !== s.line,
    ),
  };
}
export function northSouthSections(b: Bed) {
  return sections(b).filter(
    (s) => b.nsMode !== "exclude" && (b.nsMode === "include" || s.rows > 1),
  );
}
export interface Brace {
  id: string;
  fromId: string;
  toId: string;
  axis: "ew" | "ns";
  from: [number, number, number];
  to: [number, number, number];
  length: number;
  materialLength: number;
}
export function braceAxis(a: Support, b: Support): "ew" | "ns" | undefined {
  if (a.id === b.id) return undefined;
  if (Math.abs(a.z - b.z) < 0.015 && Math.abs(a.x - b.x) > 0.02) return "ew";
  if (Math.abs(a.x - b.x) < 0.015 && Math.abs(a.z - b.z) > 0.02) return "ns";
  return undefined;
}
export function braceConnections(b: Bed): BraceConnection[] {
  if (b.manualBraces !== undefined) return b.manualBraces;
  if (!b.bracingEnabled) return [];
  const all = supports(b),
    groups = new Map<string, Support[]>();
  for (const s of all) {
    const key =
      b.bracingAxis === "ns"
        ? `${s.row}:${s.runFirst}:${s.slot}`
        : `${s.row}:${s.runFirst}:${s.line}`;
    const g = groups.get(key) || [];
    g.push(s);
    groups.set(key, g);
  }
  const pairs = [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) =>
      g.sort((a, c) => (b.bracingAxis === "ns" ? c.z - a.z : a.x - c.x)),
    );
  if (!pairs.length) return [];
  return Array.from({ length: b.bracingCount ?? 2 }, (_, i) => {
    const g = pairs[Math.floor(i / 2) % pairs.length];
    return {
      id: `legacy-${i}`,
      fromId: g[0].id,
      toId: g[g.length - 1].id,
      axis: b.bracingAxis ?? "ew",
      reverse: !!(i % 2),
    };
  });
}
export function braces(b: Bed): Brace[] {
  const all = supports(b);
  return braceConnections(b).flatMap((c) => {
    let a = all.find((s) => s.id === c.fromId),
      z = all.find((s) => s.id === c.toId);
    if (!a || !z || braceAxis(a, z) !== c.axis) return [];
    if (c.reverse) [a, z] = [z, a];
    const from: [number, number, number] = [a.x, 0.05, a.z],
      to: [number, number, number] = [z.x, Math.max(0.1, z.length - 0.05), z.z],
      length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    return [
      {
        id: c.id,
        fromId: c.fromId,
        toId: c.toId,
        axis: c.axis,
        from,
        to,
        length,
        materialLength:
          b.manualBraces === undefined ? (b.bracingLength ?? length) : length,
      },
    ];
  });
}
export function memberCuts(b: Bed) {
  const d = dimensions(b),
    tracks = supportTracks(b),
    cuts: {
      id: string;
      kind: "ew" | "ns" | "brace";
      length: number;
      pieces: number;
    }[] = [];
  for (const t of tracks) {
    const length =
      t.axis === "x"
        ? t.end - t.start + 2 * b.overhang
        : (t.end - t.start) / Math.cos(d.rad);
    cuts.push({
      id: t.id,
      kind: t.axis === "x" ? "ew" : "ns",
      length,
      pieces: Math.max(1, Math.ceil((length - 1e-8) / b.railLength)),
    });
  }
  for (const c of braces(b))
    cuts.push({
      id: c.id,
      kind: "brace",
      length: c.materialLength,
      pieces: Math.max(1, Math.ceil((c.materialLength - 1e-8) / b.railLength)),
    });
  return cuts;
}
export function railBreakdown(b: Bed) {
  const tracks = supportTracks(b),
    cuts = memberCuts(b),
    eastWest = cuts
      .filter((c) => c.kind === "ew")
      .reduce((n, c) => n + c.pieces, 0),
    northSouth = cuts
      .filter((c) => c.kind === "ns")
      .reduce((n, c) => n + c.pieces, 0),
    bracing = cuts
      .filter((c) => c.kind === "brace")
      .reduce((n, c) => n + c.pieces, 0);
  const crossings = tracks
    .filter((t) => t.axis === "x")
    .reduce(
      (n, ew) =>
        n +
        tracks.filter(
          (t) =>
            t.axis === "z" &&
            t.fixed >= ew.start - 1e-6 &&
            t.fixed <= ew.end + 1e-6 &&
            ew.fixed >= t.start - 1e-6 &&
            ew.fixed <= t.end + 1e-6,
        ).length,
      0,
    );
  return {
    eastWest,
    northSouth,
    bracing,
    beamClip: crossings * (b.beamClipsPerCrossing ?? 1),
    splice: cuts.reduce((n, c) => n + c.pieces - 1, 0),
    total: eastWest + northSouth + bracing,
  };
}
export function calculate(
  b: Bed,
  prices: Partial<Record<MaterialId, number>> = {},
): Material[] {
  const q: Partial<Record<MaterialId, number>> = {};
  const tracks = supportTracks(b);
  q.endClamp = tracks.filter((t) => t.axis === "x").length * 2;
  q.midClamp = 0;
  for (let r = 0; r < b.rows; r++)
    for (let c = 0; c < b.columns - 1; c++)
      if (isActive(b, r, c) && isActive(b, r, c + 1)) q.midClamp += 2;
  const rails = railBreakdown(b);
  q.rail = rails.total;
  q.beamClip = rails.beamClip;
  q.splice = rails.splice;
  const connections = braces(b),
    legs = supports(b);
  const braceLFoot = connections.filter((c) => c.axis === "ew").length * 2,
    braceTilt = connections.filter((c) => c.axis === "ns").length * 2;
  const legLFoot = legs.reduce(
      (n, s) =>
        n +
        Number(s.bottomHardware === "lFoot") +
        Number(s.topHardware === "lFoot"),
      0,
    ),
    legTilt = legs.reduce(
      (n, s) =>
        n +
        Number(s.bottomHardware === "tiltPlate") +
        Number(s.topHardware === "tiltPlate"),
      0,
    );
  q.lFoot = legLFoot + braceLFoot;
  q.tiltPlate = legTilt + braceTilt;
  const finalLFoot = b.overrides.lFoot ?? q.lFoot,
    finalTilt = b.overrides.tiltPlate ?? q.tiltPlate;
  q.tBolt = finalLFoot + Math.min(finalLFoot, braceLFoot) + 2 * finalTilt;
  q.ground = activeCount(b) > 0 ? 1 : 0;
  q.leg = supports(b).length;
  q.concrete = b.bases ? q.leg : 0;
  // Conserva los ajustes de versiones anteriores sumando las partidas antiguas.
  const legacyRail =
    b.overrides.railEW !== undefined || b.overrides.railNS !== undefined;
  const manualRail =
    b.overrides.rail ??
    (legacyRail
      ? (b.overrides.railEW ?? rails.eastWest) +
        (rails.northSouth === 0
          ? 0
          : (b.overrides.railNS ?? rails.northSouth)) +
        rails.bracing
      : undefined);
  return MATERIALS.map((m) => ({
    ...m,
    calculated: q[m.id] ?? 0,
    quantity:
      m.id === "rail"
        ? (manualRail ?? q.rail ?? 0)
        : (b.overrides[m.id] ?? q[m.id] ?? 0),
    overridden:
      m.id === "rail"
        ? manualRail !== undefined
        : b.overrides[m.id] !== undefined,
  }));
}
export function aggregate(
  project: Project,
  prices: Partial<Record<MaterialId, number>> = {},
) {
  const all = project.beds.map((b) => calculate(b, prices));
  return MATERIALS.map((m, i) => ({
    ...m,
    calculated: all.reduce((a, items) => a + items[i].calculated, 0),
    quantity: all.reduce((a, items) => a + items[i].quantity, 0),
    overridden: all.some((items) => items[i].overridden),
  }));
}
export function validateProject(input: unknown): Project {
  if (!input || typeof input !== "object")
    throw new Error("Archivo de proyecto inválido.");
  const p = input as Project;
  if (
    p.version !== 1 ||
    typeof p.name !== "string" ||
    typeof p.customer !== "string" ||
    !Array.isArray(p.beds) ||
    p.beds.length < 1 ||
    p.beds.length > 30
  )
    throw new Error("Formato de proyecto no compatible.");
  if (
    p.panelLibrary &&
    (!Array.isArray(p.panelLibrary) ||
      p.panelLibrary.length > 100 ||
      p.panelLibrary.some(
        (v) =>
          !v ||
          typeof v.id !== "string" ||
          typeof v.name !== "string" ||
          !Number.isFinite(v.width) ||
          v.width < 0.3 ||
          v.width > 3 ||
          !Number.isFinite(v.length) ||
          v.length < 0.3 ||
          v.length > 4,
      ) ||
      new Set(p.panelLibrary.map((v) => v.id)).size !== p.panelLibrary.length)
  )
    throw new Error("Biblioteca de paneles inválida.");
  if (p.roof) {
    const r = p.roof;
    if (
      typeof r.name !== "string" ||
      typeof r.dataUrl !== "string" ||
      r.dataUrl.length > 2500000 ||
      !validRasterDataUrl(r.dataUrl) ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        r.dataUrl,
      )
    )
      throw new Error(
        "Imagen de techo inválida; sólo JPEG, PNG o WebP locales.",
      );
    if (
      r.imageAspect !== undefined &&
      (!Number.isFinite(r.imageAspect) ||
        r.imageAspect < 0.001 ||
        r.imageAspect > 1000)
    )
      throw new Error("Proporción de imagen inválida.");
    if (
      r.references !== undefined &&
      (!Array.isArray(r.references) ||
        r.references.length > 2 ||
        r.references.some(
          (v) =>
            !v ||
            typeof v.id !== "string" ||
            !Number.isFinite(v.distance) ||
            v.distance <= 0 ||
            v.distance > 500 ||
            [v.from, v.to].some(
              (p) =>
                !p ||
                !Number.isFinite(p.x) ||
                !Number.isFinite(p.y) ||
                p.x < 0 ||
                p.x > 1 ||
                p.y < 0 ||
                p.y > 1,
            ),
        ))
    )
      throw new Error("Referencias de techo inválidas.");
    for (const [key, min, max] of [
      ["width", 0.5, 200],
      ["length", 0.5, 200],
      ["x", -100, 100],
      ["z", -100, 100],
      ["rotation", 0, 360],
      ["opacity", 0.1, 1],
    ] as const)
      if (!Number.isFinite(r[key]) || r[key] < min || r[key] > max)
        throw new Error("Medidas de techo inválidas.");
  }
  const ids = new Set<string>();
  const ranges: Record<string, [number, number]> = {
    rows: [1, 6],
    columns: [1, 10],
    angle: [0, 60],
    panelWidth: [0.3, 3],
    panelLength: [0.3, 4],
    gap: [0.005, 0.2],
    frontHeight: [0.1, 3],
    overhang: [0, 1],
    railLength: [0.5, 12],
    referenceRailLength: [0.5, 12],
    supportSpacing: [0.3, 3],
    baseWidth: [0.1, 2],
    baseDepth: [0.1, 2],
    baseHeight: [0.05, 1],
  };
  for (const b of p.beds) {
    if (
      !b ||
      typeof b.id !== "string" ||
      ids.has(b.id) ||
      typeof b.name !== "string" ||
      !["portrait", "landscape"].includes(b.orientation) ||
      typeof b.bases !== "boolean"
    )
      throw new Error("Datos de cama inválidos.");
    ids.add(b.id);
    if (
      b.position &&
      (!Number.isFinite(b.position.x) ||
        !Number.isFinite(b.position.z) ||
        Math.abs(b.position.x) > 200 ||
        Math.abs(b.position.z) > 200)
    )
      throw new Error("Posición de cama inválida.");
    if (
      b.azimuth !== undefined &&
      (!Number.isFinite(b.azimuth) || b.azimuth < 0 || b.azimuth >= 360)
    )
      throw new Error("Giro de cama inválido.");
    if (
      b.manualBraces !== undefined &&
      (!Array.isArray(b.manualBraces) ||
        b.manualBraces.length > 200 ||
        new Set(b.manualBraces.map((c) => c.id)).size !==
          b.manualBraces.length ||
        b.manualBraces.some(
          (c) =>
            !c ||
            typeof c.id !== "string" ||
            typeof c.fromId !== "string" ||
            typeof c.toId !== "string" ||
            c.fromId === c.toId ||
            !["ew", "ns"].includes(c.axis) ||
            (c.reverse !== undefined && typeof c.reverse !== "boolean"),
        ))
    )
      throw new Error("Contravientos inválidos.");
    if (
      b.nsMode !== undefined &&
      !["auto", "include", "exclude"].includes(b.nsMode)
    )
      throw new Error("Opción de rieles norte-sur inválida.");
    if (b.bracingAxis !== undefined && !["ew", "ns"].includes(b.bracingAxis))
      throw new Error("Eje de contravientos inválido.");
    if (b.bracingEnabled !== undefined && typeof b.bracingEnabled !== "boolean")
      throw new Error("Opción de contravientos inválida.");
    for (const [key, min, max, integer] of [
      ["beamClipsPerCrossing", 1, 8, true],
      ["bracingCount", 0, 100, true],
      ["bracingLength", 0.1, 50, false],
    ] as const) {
      const v = b[key];
      if (
        v !== undefined &&
        (!Number.isFinite(v) ||
          v < min ||
          v > max ||
          (integer && !Number.isInteger(v)))
      )
        throw new Error(`Valor inválido: ${key}`);
    }

    if (
      b.supportSpacingNS !== undefined &&
      (!Number.isFinite(b.supportSpacingNS) ||
        b.supportSpacingNS < 0.1 ||
        b.supportSpacingNS > 3)
    )
      throw new Error("Separación norte-sur inválida.");
    if (
      b.panelRotations !== undefined &&
      (typeof b.panelRotations !== "object" ||
        b.panelRotations === null ||
        Array.isArray(b.panelRotations) ||
        Object.entries(b.panelRotations).some(
          ([key, v]) =>
            !/^\d+:\d+$/.test(key) || !Number.isFinite(v) || v < 0 || v >= 360,
        ))
    )
      throw new Error("Giros de paneles inválidos.");
    if (
      b.supportOverrides !== undefined &&
      (typeof b.supportOverrides !== "object" ||
        b.supportOverrides === null ||
        Array.isArray(b.supportOverrides) ||
        Object.entries(b.supportOverrides).some(
          ([key, v]) =>
            !/^r\d+:c\d+:s\d+:n[01]$/.test(key) ||
            !v ||
            !Number.isFinite(v.x) ||
            !Number.isFinite(v.z) ||
            Math.abs(v.x) > 100 ||
            Math.abs(v.z) > 100 ||
            (v.trackId !== undefined && typeof v.trackId !== "string") ||
            (v.bottomHardware !== undefined &&
              !["lFoot", "tiltPlate", "none"].includes(v.bottomHardware)) ||
            (v.topHardware !== undefined &&
              !["lFoot", "tiltPlate", "none"].includes(v.topHardware)),
        ))
    )
      throw new Error("Posiciones de patas inválidas.");
    for (const [key, [min, max]] of Object.entries(ranges)) {
      const n = b[key as keyof Bed];
      if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max)
        throw new Error(`Valor inválido: ${key}`);
    }
    if (
      !Number.isInteger(b.rows) ||
      !Number.isInteger(b.columns) ||
      !Array.isArray(b.removed) ||
      b.removed.some((k) => typeof k !== "string" || !/^\d+:\d+$/.test(k))
    )
      throw new Error("Distribución inválida.");
    if (
      !b.overrides ||
      typeof b.overrides !== "object" ||
      Object.entries(b.overrides).some(
        ([id, v]) =>
          !(
            ["railEW", "railNS"].includes(id) ||
            MATERIALS.some((m) => m.id === id)
          ) ||
          typeof v !== "number" ||
          !Number.isFinite(v) ||
          v < 0 ||
          !Number.isInteger(v) ||
          v > 100000,
      )
    )
      throw new Error("Cantidades manuales inválidas.");
  }
  p.beds = p.beds.map((b, i) => ({
    ...b,
    position: b.position ?? { x: bedPose(p, i).x, z: bedPose(p, i).z },
    azimuth: b.azimuth ?? 0,
    manualBraces: b.manualBraces ?? braceConnections(b),
  }));
  return p;
}
