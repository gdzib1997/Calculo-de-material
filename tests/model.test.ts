import { describe, it, expect } from "vitest";
import {
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
  calculate(b).find((m) => m.id === id)!.quantity;
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
          expect(m.find((m) => m.id === id)?.quantity).toBe(n);
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
      before.find((m) => m.id === "railEW")!.quantity,
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
    expect(all.find((m) => m.id === "railEW")!.quantity).toBe(
      quantity(p.beds[0], "railEW") * 2,
    );
    expect(all.find((m) => m.id === "railEW")!.price).toBe(100);
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
