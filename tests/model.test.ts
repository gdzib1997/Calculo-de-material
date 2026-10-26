import { describe, it, expect } from "vitest";
import {
  railBreakdown,
  braces,
  activeCount,
  aggregate,
  calculate,
  createBed,
  createProject,
  dimensions,
  isActive,
  MATERIALS,
  panelKey,
  referenceQuantity,
  sections,
  supports,
  validateProject,
} from "../src/lib/model";
import type { Bed, MaterialId } from "../src/lib/model";
const quantity = (b: Bed, id: MaterialId) =>
  id === "railEW"
    ? railBreakdown(b).eastWest
    : id === "railNS"
      ? railBreakdown(b).northSouth
      : calculate(b).find((m) => m.id === id)!.quantity;
describe("Tabla aportada por el usuario", () => {
  const expectedRail = [
    [4, 6, 7, 8, 10, 11, 13, 14, 16],
    [7, 10, 13, 16, 19, 21, 24, 26, 28],
  ];
  for (const rows of [1, 2])
    for (let columns = 2; columns <= 10; columns++)
      it(`reproduce ${rows} × ${columns} sin cambios manuales`, () => {
        const bed = { ...createBed(), rows, columns };
        const m = calculate(bed);
        expect(quantity(bed, "railEW")).toBe(
          expectedRail[rows - 1][columns - 2],
        );
        const base = referenceQuantity(rows, columns);
        for (const [id, n] of Object.entries(base))
          if (id !== "beamClip")
            expect(quantity(bed, id as MaterialId)).toBe(n);
        expect(quantity(bed, "midClamp")).toBe(2 * rows * (columns - 1));
      });
  it("excluye norte–sur en una cama sencilla incluso con ajuste previo", () => {
    const b = { ...createBed(), rows: 1, overrides: { railNS: 40 } };
    expect(quantity(b, "railNS")).toBe(0);
  });
  it("recalcula al quitar y reponer un panel", () => {
    const b = createBed();
    const before = calculate(b);
    b.removed = [panelKey(0, 0)];
    expect(activeCount(b)).toBe(11);
    expect(quantity(b, "midClamp")).toBeLessThan(
      before.find((m) => m.id === "midClamp")!.quantity,
    );
    expect(quantity(b, "railEW")).not.toBe(
      railBreakdown({ ...b, removed: [] }).eastWest,
    );
    b.removed = [];
    expect(calculate(b)).toEqual(before);
  });
  it("respeta los ajustes manuales hasta restablecerlos", () => {
    const b = { ...createBed(), overrides: { midClamp: 99 } };
    b.removed = [panelKey(0, 0)];
    expect(quantity(b, "midClamp")).toBe(99);
    b.overrides = { midClamp: undefined } as never;
    expect(quantity(b, "midClamp")).not.toBe(99);
  });
  it("una cama completamente vacía no genera materiales automáticos", () => {
    const b = createBed();
    for (let r = 0; r < b.rows; r++)
      for (let c = 0; c < b.columns; c++) b.removed.push(panelKey(r, c));
    expect(activeCount(b)).toBe(0);
    expect(calculate(b).every((m) => m.quantity === 0)).toBe(true);
    expect(supports(b)).toHaveLength(0);
  });
  it("no crea bloques cuando las bases están desactivadas", () => {
    const b = { ...createBed(), bases: false };
    expect(quantity(b, "concrete")).toBe(0);
    expect(quantity(b, "leg")).toBeGreaterThan(0);
  });
  it("escala piezas comerciales sin redondear hacia abajo", () => {
    const b = { ...createBed(), railLength: 2.35 };
    expect(quantity(b, "railEW")).toBe(
      2 * quantity({ ...b, railLength: 4.7 }, "railEW"),
    );
  });
});
describe("Geometría y distribuciones", () => {
  it("utiliza las medidas del usuario como valores iniciales", () => {
    const b = createBed();
    expect(b.panelWidth).toBe(1.14);
    expect(b.panelLength).toBe(2.38);
    expect(b.railLength).toBe(4.7);
    expect(b.gap).toBe(0.02);
    expect(b.overhang).toBe(0.05);
  });
  it("calcula alturas con seno del ángulo sin sumar el bloque", () => {
    const b = { ...createBed(), angle: 30, frontHeight: 0.4 };
    const d = dimensions(b);
    expect(d.rearHeight).toBeCloseTo(0.4 + d.length * 0.5);
    const legs = supports(b);
    for (const s of legs) {
      const distance = (d.depth / 2 - s.z) / Math.cos(d.rad);
      expect(s.length).toBeCloseTo(0.4 + distance * 0.5);
    }
  });
  it("a cero grados todas las patas tienen la misma altura", () => {
    const b = { ...createBed(), angle: 0 };
    expect(supports(b).every((s) => s.length === b.frontHeight)).toBe(true);
  });
  it("cambiar orientación intercambia las dimensiones sin cambiar el área", () => {
    const b = createBed(),
      a = dimensions(b),
      c = dimensions({ ...b, orientation: "landscape" });
    expect(a.w).toBe(c.l);
    expect(a.l).toBe(c.w);
  });
  it("cubre cada panel activo exactamente una vez en formas irregulares", () => {
    for (let seed = 0; seed < 40; seed++) {
      const b = { ...createBed(), rows: 6, columns: 10 };
      for (let r = 0; r < b.rows; r++)
        for (let c = 0; c < b.columns; c++)
          if ((r * 17 + c * 7 + seed * 11) % 5 < 2)
            b.removed.push(panelKey(r, c));
      const covered = new Set<string>();
      for (const s of sections(b))
        for (let r = s.row; r < s.row + s.rows; r++)
          for (let c = s.column; c < s.column + s.columns; c++) {
            expect(isActive(b, r, c)).toBe(true);
            expect(covered.has(panelKey(r, c))).toBe(false);
            covered.add(panelKey(r, c));
          }
      expect(covered.size).toBe(activeCount(b));
    }
  });
  it("las patas y los bloques cambian al quitar paneles", () => {
    const b = createBed(),
      full = supports(b).length;
    b.removed = Array.from({ length: b.columns }, (_, c) => panelKey(0, c));
    expect(supports(b).length).toBeLessThan(full);
    expect(quantity(b, "concrete")).toBe(supports(b).length);
    expect(quantity(b, "railNS")).toBe(0);
  });
});
describe("Proyectos y archivos", () => {
  it("suma materiales de varias camas y conserva precios", () => {
    const p = createProject();
    p.beds.push(createBed(2));
    const all = aggregate(p, { railEW: 100 });
    expect(all.find((m) => m.id === "rail")!.quantity).toBe(
      quantity(p.beds[0], "rail") * 2,
    );
    expect(all.find((m) => m.id === "rail")!.price).toBe(100);
    expect(all).toHaveLength(MATERIALS.length);
  });
  it("permite guardar y recuperar la biblioteca y cantidades manuales", () => {
    const p = createProject();
    p.beds[0].overrides = { tBolt: 87 };
    const decoded = validateProject(JSON.parse(JSON.stringify(p)));
    expect(decoded).toEqual(p);
    expect(decoded.panelLibrary?.[0].length).toBe(2.38);
  });
  it("rechaza archivos que podrían producir geometría inválida", () => {
    const p = createProject();
    p.beds[0].angle = NaN;
    expect(() => validateProject(p)).toThrow();
  });
  it("rechaza cantidades negativas e IDs de material desconocidos", () => {
    const p = createProject();
    p.beds[0].overrides = { tBolt: -3 };
    expect(() => validateProject(p)).toThrow();
    p.beds[0].overrides = { unknown: 2 } as never;
    expect(() => validateProject(p)).toThrow();
  });
  it("rechaza bibliotecas y precios fuera de rango", () => {
    const p = createProject();
    p.panelLibrary![0].width = -1;
    expect(() => validateProject(p)).toThrow();
    const other = createProject();
    other.prices = { railEW: -30 };
    expect(() => validateProject(other)).toThrow();
  });
});

describe("Edición individual y compatibilidad", () => {
  it("mantiene proyectos anteriores sin campos nuevos", () => {
    const p = createProject();
    delete p.beds[0].supportSpacingNS;
    delete p.beds[0].supportOverrides;
    delete p.beds[0].panelRotations;
    expect(() => validateProject(JSON.parse(JSON.stringify(p)))).not.toThrow();
    const b = p.beds[0],
      d = dimensions(b);
    expect(supports(b)[0].z).toBeCloseTo(
      d.depth / 2 - d.l * 0.2 * Math.cos(d.rad),
    );
  });
  it("aplica la separación N–S horizontal exacta sin alterar E–O", () => {
    const b = { ...createBed(), supportSpacingNS: 1 };
    const all = supports(b),
      first = all[0],
      opposite = all.find(
        (s) =>
          s.row === first.row && s.slot === first.slot && s.line !== first.line,
      )!;
    expect(first.z - opposite.z).toBeCloseTo(1);
    const wider = supports({ ...b, supportSpacingNS: 1.8 });
    expect(wider[0].z - wider[1].z).toBeCloseTo(1.8);
    expect(all.map((s) => s.x)).toEqual(wider.map((s) => s.x));
  });
  it("mover una pata conserva las otras y recalcula la altura", () => {
    const b = createBed();
    const original = supports(b),
      first = original[0];
    b.supportOverrides = { [first.id]: { x: first.x + 0.1, z: first.z - 0.2 } };
    const moved = supports(b);
    expect(moved[0].x).toBeCloseTo(first.x + 0.1);
    expect(moved[0].z).toBeCloseTo(first.z - 0.2);
    expect(moved[0].length - first.length).toBeCloseTo(
      0.2 * Math.tan(dimensions(b).rad),
    );
    expect(moved.slice(1)).toEqual(original.slice(1));
    expect(moved[0].moved).toBe(true);
    expect(quantity(b, "concrete")).toBe(original.length);
    delete b.supportOverrides[first.id];
    expect(supports(b)).toEqual(original);
  });
  it("las patas fuera de la nueva huella se limitan y se identifican", () => {
    const b = createBed();
    const id = supports(b)[0].id;
    b.supportOverrides = { [id]: { x: 99, z: 99 } };
    const s = supports(b)[0],
      d = dimensions(b);
    expect(s.x).toBe(d.width / 2);
    expect(s.z).toBe(d.depth / 2);
    expect(s.constrained).toBe(true);
    expect(s.length).toBe(b.frontHeight);
  });
  it("un giro individual de 90° amplía sólo las celdas que lo necesitan", () => {
    const b = createBed();
    const before = dimensions(b);
    b.panelRotations = { "0:0": 90 };
    const after = dimensions(b);
    expect(after.width - before.width).toBeCloseTo(
      b.panelLength - b.panelWidth,
    );
    expect(after.columnWidths[1]).toBe(before.columnWidths[1]);
    expect(after.rowLengths[0]).toBeCloseTo(before.rowLengths[0]);
    expect(activeCount(b)).toBe(12);
    expect(quantity(b, "midClamp")).toBe(20);
  });
  it("los giros arbitrarios mantienen separadas las envolventes", () => {
    const b = createBed();
    b.panelRotations = { "0:0": 45, "1:1": 120 };
    const d = dimensions(b);
    for (let c = 1; c < b.columns; c++)
      expect(
        d.columnCenters[c] -
          d.columnWidths[c] / 2 -
          (d.columnCenters[c - 1] + d.columnWidths[c - 1] / 2),
      ).toBeCloseTo(b.gap);
  });
  it("rechaza imágenes externas, SVG y coordenadas o giros no válidos", () => {
    const p = createProject();
    p.roof = {
      dataUrl: "https://example.com/foto.jpg",
      name: "foto",
      width: 12,
      length: 10,
      x: 0,
      z: 0,
      rotation: 0,
      opacity: 1,
    };
    expect(() => validateProject(p)).toThrow();
    delete p.roof;
    p.beds[0].panelRotations = { "0:0": 360 };
    expect(() => validateProject(p)).toThrow();
    p.beds[0].panelRotations = {};
    p.beds[0].supportOverrides = { "r0:c0:s0:n0": { x: NaN, z: 0 } };
    expect(() => validateProject(p)).toThrow();
  });
  it("recupera giros y posiciones manuales en una copia JSON", () => {
    const p = createProject();
    const b = p.beds[0];
    b.panelRotations = { "0:0": 90 };
    const s = supports(b)[0];
    b.supportOverrides = { [s.id]: { x: 0, z: 0 } };
    const restored = validateProject(JSON.parse(JSON.stringify(p)));
    expect(restored.beds[0].panelRotations).toEqual({ "0:0": 90 });
    expect(supports(restored.beds[0])[0].x).toBe(0);
  });
});

describe("Rieles agrupados, norte–sur opcional y contravientos", () => {
  it("presenta una sola partida de riel sin duplicar componentes", () => {
    const b = createBed(),
      q = railBreakdown(b),
      items = calculate(b);
    expect(items.filter((m) => m.id === "rail")).toHaveLength(1);
    expect(items.some((m) => m.id === "railEW" || m.id === "railNS")).toBe(
      false,
    );
    expect(quantity(b, "rail")).toBe(q.eastWest + q.northSouth + q.bracing);
  });
  it("permite incluir norte–sur en sencilla y excluirlo en doble", () => {
    const b = { ...createBed(), rows: 1 };
    expect(railBreakdown(b).northSouth).toBe(0);
    expect(quantity(b, "beamClip")).toBe(0);
    b.nsMode = "include";
    expect(railBreakdown(b).northSouth).toBeGreaterThan(0);
    expect(quantity(b, "beamClip")).toBeGreaterThan(0);
    b.rows = 2;
    b.nsMode = "exclude";
    expect(railBreakdown(b).northSouth).toBe(0);
    expect(quantity(b, "beamClip")).toBe(0);
  });
  it("los Beam Clip dependen de cruces y factor, no de los empalmes comerciales", () => {
    const b = createBed();
    expect(quantity(b, "beamClip")).toBe(24);
    expect(quantity({ ...b, beamClipsPerCrossing: 2 }, "beamClip")).toBe(48);
    expect(quantity({ ...b, railLength: 2 }, "beamClip")).toBe(24);
  });
  it("suma piezas por contraviento redondeando cada diagonal", () => {
    const b = {
      ...createBed(),
      bracingEnabled: true,
      bracingCount: 3,
      bracingLength: 5,
    };
    expect(braces(b)).toHaveLength(3);
    expect(railBreakdown(b).bracing).toBe(6);
    expect(
      quantity(b, "rail") - quantity({ ...b, bracingEnabled: false }, "rail"),
    ).toBe(6);
  });
  it("los contravientos automáticos siguen las patas y no aparecen sin paneles", () => {
    const b = { ...createBed(), bracingEnabled: true };
    const before = braces(b)[0].length;
    const leg = supports(b)[0];
    b.supportOverrides = { [leg.id]: { x: leg.x + 0.3, z: leg.z } };
    expect(braces(b)[0].length).not.toBe(before);
    for (let r = 0; r < b.rows; r++)
      for (let c = 0; c < b.columns; c++) b.removed.push(panelKey(r, c));
    expect(braces(b)).toHaveLength(0);
    expect(railBreakdown(b).total).toBe(0);
  });
  it("conserva precios y cantidades antiguos sin crear partidas separadas", () => {
    const b = createBed();
    b.overrides = { railEW: 99, railNS: 7 };
    const m = calculate(b, { railEW: 200 }).find((m) => m.id === "rail")!;
    expect(m.quantity).toBe(106);
    expect(m.overridden).toBe(true);
    expect(m.price).toBe(200);
    b.overrides.rail = 12;
    expect(quantity(b, "rail")).toBe(12);
  });
  it("valida opciones de contravientos y factor de cruces", () => {
    const p = createProject();
    p.beds[0].bracingCount = -1;
    expect(() => validateProject(p)).toThrow();
    p.beds[0].bracingCount = 2;
    p.beds[0].beamClipsPerCrossing = 0;
    expect(() => validateProject(p)).toThrow();
  });
});
