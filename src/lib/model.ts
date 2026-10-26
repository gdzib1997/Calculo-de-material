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
export interface RoofImage {
  dataUrl: string;
  name: string;
  width: number;
  length: number;
  x: number;
  z: number;
  rotation: number;
  opacity: number;
}
export interface SupportPosition {
  x: number;
  z: number;
}
export interface Bed {
  id: string;
  name: string;
  rows: number;
  columns: number;
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
  price: number;
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
    beds: [createBed()],
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
  const w = b.orientation === "portrait" ? b.panelWidth : b.panelLength;
  const l = b.orientation === "portrait" ? b.panelLength : b.panelWidth;
  const extents = (r: number, c: number) => {
    const a = (panelRotation(b, r, c) * Math.PI) / 180;
    return {
      w: Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * l,
      l: Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * l,
    };
  };
  const columnWidths = Array.from({ length: b.columns }, (_, c) =>
    Math.max(...Array.from({ length: b.rows }, (_, r) => extents(r, c).w)),
  );
  const rowLengths = Array.from({ length: b.rows }, (_, r) =>
    Math.max(...Array.from({ length: b.columns }, (_, c) => extents(r, c).l)),
  );
  const centers = (values: number[]) =>
    values.map(
      (v, i) =>
        values.slice(0, i).reduce((a, n) => a + n, 0) + i * b.gap + v / 2,
    );
  const columnCenters = centers(columnWidths),
    rowCenters = centers(rowLengths);
  const width =
    columnWidths.reduce((a, n) => a + n, 0) + (b.columns - 1) * b.gap;
  const length = rowLengths.reduce((a, n) => a + n, 0) + (b.rows - 1) * b.gap;
  const rad = (b.angle * Math.PI) / 180;
  return {
    w,
    l,
    width,
    length,
    rad,
    columnWidths,
    rowLengths,
    columnCenters,
    rowCenters,
    depth: length * Math.cos(rad),
    rearHeight: b.frontHeight + length * Math.sin(rad),
  };
}
export function sectionDimensions(b: Bed, section: Section) {
  const d = dimensions(b);
  return {
    width:
      d.columnWidths
        .slice(section.column, section.column + section.columns)
        .reduce((a, n) => a + n, 0) +
      (section.columns - 1) * b.gap,
    length:
      d.rowLengths
        .slice(section.row, section.row + section.rows)
        .reduce((a, n) => a + n, 0) +
      (section.rows - 1) * b.gap,
    startX:
      d.columnCenters[section.column] -
      d.columnWidths[section.column] / 2 -
      d.width / 2,
    startDistance: d.rowCenters[section.row] - d.rowLengths[section.row] / 2,
  };
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
}
export function supports(b: Bed): Support[] {
  const d = dimensions(b),
    result: Support[] = [];
  for (let r = 0; r < b.rows; r++) {
    let c = 0;
    while (c < b.columns) {
      if (!isActive(b, r, c)) {
        c++;
        continue;
      }
      const first = c;
      while (c < b.columns && isActive(b, r, c)) c++;
      const start =
        d.columnCenters[first] - d.columnWidths[first] / 2 - d.width / 2;
      const span =
        d.columnWidths.slice(first, c).reduce((a, n) => a + n, 0) +
        (c - first - 1) * b.gap;
      const inset = Math.min(0.2, span / 4),
        available = span - 2 * inset;
      const n = Math.max(2, Math.ceil(available / b.supportSpacing) + 1);
      for (let i = 0; i < n; i++)
        for (const [line, local] of supportLines(b, r).entries()) {
          const id = `r${r}:c${first}:s${i}:n${line}`;
          const autoX = start + inset + (available * i) / (n - 1),
            autoZ = d.depth / 2 - local * Math.cos(d.rad);
          const manual = b.supportOverrides?.[id];
          const x = Math.max(
            -d.width / 2,
            Math.min(d.width / 2, manual?.x ?? autoX),
          );
          const z = Math.max(
            -d.depth / 2,
            Math.min(d.depth / 2, manual?.z ?? autoZ),
          );
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
            constrained: !!manual && (x !== manual.x || z !== manual.z),
            length: b.frontHeight + (d.depth / 2 - z) * Math.tan(d.rad),
          });
        }
    }
  }
  return result;
}
export function supportNeighbours(b: Bed, id: string) {
  const all = supports(b),
    current = all.find((s) => s.id === id);
  if (!current) return { previous: undefined, opposite: undefined };
  return {
    previous: all
      .filter(
        (s) =>
          s.row === current.row &&
          s.runFirst === current.runFirst &&
          s.line === current.line &&
          s.x < current.x - 0.001,
      )
      .sort((a, b) => b.x - a.x)[0],
    opposite: all.find(
      (s) =>
        s.row === current.row &&
        s.runFirst === current.runFirst &&
        s.slot === current.slot &&
        s.line !== current.line,
    ),
  };
}
export function northSouthSections(b: Bed) {
  return sections(b).filter(
    (s) => b.nsMode !== "exclude" && (b.nsMode === "include" || s.rows > 1),
  );
}
export interface Brace {
  from: [number, number, number];
  to: [number, number, number];
  length: number;
  materialLength: number;
}
export function braces(b: Bed): Brace[] {
  if (!b.bracingEnabled || !activeCount(b)) return [];
  const all = supports(b),
    groups = new Map<string, Support[]>();
  for (const leg of all) {
    const key =
      b.bracingAxis === "ns"
        ? `${leg.row}:${leg.runFirst}:${leg.slot}`
        : `${leg.row}:${leg.runFirst}:${leg.line}`;
    const g = groups.get(key) || [];
    g.push(leg);
    groups.set(key, g);
  }
  const pairs = [...groups.values()]
    .filter((g) => g.length >= 2)
    .map((g) =>
      g.sort((a, c) => (b.bracingAxis === "ns" ? c.z - a.z : a.x - c.x)),
    );
  if (!pairs.length) return [];
  return Array.from({ length: b.bracingCount ?? 2 }, (_, i) => {
    const g = pairs[Math.floor(i / 2) % pairs.length];
    const first = i % 2 ? g[g.length - 1] : g[0],
      last = i % 2 ? g[0] : g[g.length - 1];
    const from: [number, number, number] = [first.x, 0.05, first.z],
      to: [number, number, number] = [
        last.x,
        Math.max(0.1, last.length - 0.05),
        last.z,
      ];
    const length = Math.hypot(
      to[0] - from[0],
      to[1] - from[1],
      to[2] - from[2],
    );
    return { from, to, length, materialLength: b.bracingLength ?? length };
  });
}
export function railBreakdown(b: Bed) {
  const eastWest = Math.ceil(
    (sections(b).reduce(
      (n, s) => n + (referenceQuantity(s.rows, s.columns).railEW ?? 0),
      0,
    ) *
      b.referenceRailLength) /
      b.railLength,
  );
  let northSouth = 0,
    beamClip = 0;
  for (const section of northSouthSections(b)) {
    const bounds = sectionDimensions(b, section),
      lines = Math.ceil(bounds.width / b.supportSpacing) + 1;
    northSouth += lines * Math.ceil(bounds.length / b.railLength);
    beamClip += lines * section.rows * 2 * (b.beamClipsPerCrossing ?? 1);
  }
  const bracing = braces(b).reduce(
    (n, brace) => n + Math.ceil(brace.materialLength / b.railLength),
    0,
  );
  return {
    eastWest,
    northSouth,
    bracing,
    beamClip,
    total: eastWest + northSouth + bracing,
  };
}
function materialPrice(
  id: MaterialId,
  prices: Partial<Record<MaterialId, number>>,
) {
  return id === "rail"
    ? (prices.rail ?? prices.railEW ?? prices.railNS ?? 0)
    : (prices[id] ?? 0);
}
export function calculate(
  b: Bed,
  prices: Partial<Record<MaterialId, number>> = {},
): Material[] {
  const q: Partial<Record<MaterialId, number>> = {};
  for (const section of sections(b))
    for (const [id, n] of Object.entries(
      referenceQuantity(section.rows, section.columns),
    ))
      q[id as MaterialId] = (q[id as MaterialId] ?? 0) + n;
  const rails = railBreakdown(b);
  q.rail = rails.total;
  q.beamClip = rails.beamClip;
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
    price: materialPrice(m.id, prices),
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
    price: materialPrice(m.id, prices),
  }));
}
export function warnings(b: Bed) {
  const list = [
    "Estimación de materiales; no verifica cargas de viento, sismo, nieve, anclajes ni capacidad estructural.",
  ];
  if (b.removed.length || b.rows > 2 || b.columns === 1)
    list.push(
      "La distribución irregular o fuera de 1×2–1×10 / 2×2–2×10 se estima por tramos. Requiere revisión de ingeniería.",
    );
  list.push(
    "Tabla transcrita de la imagen del usuario. Manuales Ascender pendientes de consulta y validación; no se afirma compatibilidad de piezas.",
  );
  list.push(
    `Longitud de referencia del riel: ${b.referenceRailLength.toFixed(2)} m, suposición editable para interpretar la tabla; la imagen no la especifica.`,
  );
  if (b.bases)
    list.push(
      "Bloques: uno por pata dibujada, sin dimensionar lastre ni estabilidad. Las patas mostradas son alturas verticales geométricas, sin descuentos de herrajes.",
    );
  if (Object.keys(b.overrides).length)
    list.push(
      "Hay cantidades manuales fijas: no cambiarán al quitar paneles hasta restablecer el cálculo automático.",
    );
  if (Object.keys(b.panelRotations || {}).length)
    list.push(
      "Los giros individuales amplían las celdas para evitar solapamientos. Los herrajes de la tabla no validan un montaje mixto; revisar fijaciones y rieles.",
    );
  if (Object.keys(b.supportOverrides || {}).length)
    list.push(
      "Hay patas desplazadas. Sus alturas y bloques siguen sus posiciones; se debe revisar su conexión y alineación con los rieles esquemáticos.",
    );
  if (supports(b).some((s) => s.constrained))
    list.push(
      "Al cambiar la huella, algunas posiciones manuales quedaron fuera y se limitaron a sus bordes. Revisa esas patas.",
    );
  if (
    b.supportSpacingNS !== undefined &&
    dimensions(b).rowLengths.some(
      (l) => l * Math.cos(dimensions(b).rad) - 0.1 < b.supportSpacingNS!,
    )
  )
    list.push(
      "La separación N–S solicitada no cabe en alguna fila: se limita a su fondo horizontal menos 10 cm. Revisa la separación efectiva.",
    );
  list.push(
    "Rieles agrupados: E–O + N–S habilitados + contravientos. Beam Clip automático: líneas N–S × 2 cruces por fila × clips por cruce; factor editable sin validación del fabricante.",
  );
  if (b.bracingEnabled)
    list.push(
      "Contravientos: una diagonal por unidad; piezas por diagonal redondeadas hacia arriba, sin aprovechar sobrantes entre diagonales. Su colocación y conexiones son esquemáticas, pendientes de revisión estructural.",
    );
  if (
    b.overrides.rail === undefined &&
    (b.overrides.railEW !== undefined || b.overrides.railNS !== undefined)
  )
    list.push(
      "Se conservaron ajustes antiguos de rieles dentro del total agrupado. Restablece el riel para usar el cálculo automático actual.",
    );
  return list;
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
    p.prices &&
    (typeof p.prices !== "object" ||
      Object.entries(p.prices).some(
        ([id, v]) =>
          !(
            ["railEW", "railNS"].includes(id) ||
            MATERIALS.some((m) => m.id === id)
          ) ||
          typeof v !== "number" ||
          !Number.isFinite(v) ||
          v < 0 ||
          v > 100000000,
      ))
  )
    throw new Error("Precios inválidos.");
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
            Math.abs(v.z) > 100,
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
  return p;
}
