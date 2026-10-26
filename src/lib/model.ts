export type MaterialId =
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
  { id: "railEW", name: "Riel este–oeste", unit: "pza" },
  { id: "railNS", name: "Riel norte–sur", unit: "pza" },
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
export function dimensions(b: Bed) {
  const w = b.orientation === "portrait" ? b.panelWidth : b.panelLength;
  const l = b.orientation === "portrait" ? b.panelLength : b.panelWidth;
  const width = b.columns * w + (b.columns - 1) * b.gap;
  const length = b.rows * l + (b.rows - 1) * b.gap;
  const rad = (b.angle * Math.PI) / 180;
  return {
    w,
    l,
    width,
    length,
    rad,
    depth: length * Math.cos(rad),
    rearHeight: b.frontHeight + length * Math.sin(rad),
  };
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
  x: number;
  z: number;
  length: number;
  row: number;
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
      const start = first * (d.w + b.gap) - d.width / 2;
      const span = (c - first) * d.w + (c - first - 1) * b.gap;
      const inset = Math.min(0.2, span / 4),
        available = span - 2 * inset;
      const n = Math.max(2, Math.ceil(available / b.supportSpacing) + 1);
      for (let i = 0; i < n; i++)
        for (const f of [0.2, 0.8]) {
          const local = r * (d.l + b.gap) + d.l * f;
          result.push({
            x: start + inset + (available * i) / (n - 1),
            z: d.depth / 2 - local * Math.cos(d.rad),
            length: b.frontHeight + local * Math.sin(d.rad),
            row: r,
          });
        }
    }
  }
  return result;
}
export function calculate(
  b: Bed,
  prices: Partial<Record<MaterialId, number>> = {},
): Material[] {
  const q: Partial<Record<MaterialId, number>> = {};
  for (const section of sections(b)) {
    for (const [id, n] of Object.entries(
      referenceQuantity(section.rows, section.columns),
    ))
      q[id as MaterialId] = (q[id as MaterialId] ?? 0) + n;
  }
  q.railEW = Math.ceil(
    ((q.railEW ?? 0) * b.referenceRailLength) / b.railLength,
  );
  // Riel N–S sólo en tramos con dos filas: regla solicitada por el usuario.
  const d = dimensions(b);
  q.railNS = sections(b)
    .filter((s) => s.rows > 1)
    .reduce(
      (sum, s) =>
        sum +
        Math.ceil(
          (s.columns * d.w + (s.columns - 1) * b.gap) / b.supportSpacing + 1,
        ) *
          Math.ceil((2 * d.l + b.gap) / b.railLength),
      0,
    );
  q.leg = supports(b).length;
  q.concrete = b.bases ? q.leg : 0;
  return MATERIALS.map((m) => ({
    ...m,
    calculated: q[m.id] ?? 0,
    quantity:
      m.id === "railNS" && q.railNS === 0
        ? 0
        : (b.overrides[m.id] ?? q[m.id] ?? 0),
    overridden:
      b.overrides[m.id] !== undefined && !(m.id === "railNS" && q.railNS === 0),
    price: prices[m.id] ?? 0,
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
    price: prices[m.id] ?? 0,
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
          !MATERIALS.some((m) => m.id === id) ||
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
          !MATERIALS.some((m) => m.id === id) ||
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
