import { describe, it, expect } from "vitest";
import {
  createBed,
  createProject,
  calculate,
  aggregate,
  activeCount,
  dimensions,
  panelPlacement,
  panelKey,
  supportTracks,
  supports,
  snapSupport,
  railBreakdown,
  braces,
  braceAxis,
  braceConnections,
  calibrateRoof,
  bedPose,
  projectBounds,
  validateProject,
  panelClamps,
} from "../src/lib/model";
import type { Bed, MaterialId, RoofImage } from "../src/lib/model";
const quantity = (b: Bed, id: MaterialId) =>
  calculate(b).find((v) => v.id === id)!.quantity;
function addBrace(b: Bed, axis: "ew" | "ns", reverse = false) {
  const legs = supports(b),
    a = legs[0],
    z =
      axis === "ew"
        ? legs.filter((s) => s.row === a.row && s.line === a.line).at(-1)!
        : legs[1];
  b.manualBraces = [
    ...(b.manualBraces ?? []),
    { id: crypto.randomUUID(), fromId: a.id, toId: z.id, axis, reverse },
  ];
  return b;
}
const roof = (): RoofImage => ({
  dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
  name: "techo.png",
  width: 12,
  length: 6,
  imageAspect: 2,
  x: 0,
  z: 0,
  rotation: 0,
  opacity: 1,
});
describe("Materiales por geometría", () => {
  for (const rows of [1, 2])
    for (let columns = 2; columns <= 10; columns++)
      it(`abrazaderas de cama completa ${rows} × ${columns}`, () => {
        const b = { ...createBed(), rows, columns };
        expect(quantity(b, "midClamp")).toBe(2 * rows * (columns - 1));
        expect(quantity(b, "endClamp")).toBe(4 * rows);
        expect(quantity(b, "ground")).toBe(1);
      });
  it("usa medidas del usuario y cuenta perfiles comerciales reales", () => {
    const b = createBed();
    expect([
      b.panelWidth,
      b.panelLength,
      b.railLength,
      b.gap,
      b.overhang,
    ]).toEqual([1.14, 2.38, 4.7, 0.02, 0.05]);
    expect(railBreakdown(b)).toEqual({
      eastWest: 8,
      northSouth: 12,
      bracing: 0,
      beamClip: 24,
      splice: 10,
      total: 20,
    });
  });
  it("no duplica perfiles ni muestra precios", () => {
    const q = calculate(createBed());
    expect(q.filter((v) => v.id === "rail")).toHaveLength(1);
    expect(q.some((v) => v.id === "railEW" || v.id === "railNS")).toBe(false);
    expect(q.every((v) => !("price" in v))).toBe(true);
  });
  it("las piezas se redondean por miembro, con tolerancia de corte exacto", () => {
    const b = { ...createBed(), columns: 4, rows: 1, overhang: 0.04 };
    expect(railBreakdown(b).eastWest).toBe(2);
    expect(railBreakdown({ ...b, overhang: 0.05 }).eastWest).toBe(4);
  });
  it("N–S es opcional, incluso en una cama sencilla", () => {
    const b: Bed = { ...createBed(), rows: 1, nsMode: "exclude" };
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
  it("clips por intersección, independientes del número de piezas comerciales", () => {
    const b = createBed();
    expect(quantity(b, "beamClip")).toBe(24);
    expect(quantity({ ...b, beamClipsPerCrossing: 2 }, "beamClip")).toBe(48);
    expect(quantity({ ...b, railLength: 2.35 }, "beamClip")).toBe(24);
    expect(railBreakdown({ ...b, railLength: 2.35 }).total).toBe(30);
  });
  it("al retirar un panel conserva las abrazaderas de la otra fila", () => {
    const b = createBed(),
      before = calculate(b);
    b.removed = ["0:0"];
    expect(quantity(b, "midClamp")).toBe(18);
    expect(quantity(b, "endClamp")).toBe(8);
    expect(activeCount(b)).toBe(11);
    b.removed = [];
    expect(calculate(b)).toEqual(before);
  });
  it("la tierra es una por cama aunque existan varios tramos", () => {
    const b = createBed();
    b.removed = ["0:1", "1:1", "0:4", "1:4"];
    expect(quantity(b, "ground")).toBe(1);
    const p = createProject();
    p.beds = [b, createBed(2), createBed(3)];
    expect(aggregate(p).find((v) => v.id === "ground")!.quantity).toBe(3);
  });
  it("una cama vacía no consume materiales", () => {
    const b = createBed();
    b.removed = Array.from({ length: b.rows }, (_, r) =>
      Array.from({ length: b.columns }, (_, c) => panelKey(r, c)),
    ).flat();
    expect(supports(b)).toHaveLength(0);
    expect(calculate(b).every((v) => v.quantity === 0)).toBe(true);
  });
  it("los bloques siguen a las patas y se pueden desactivar", () => {
    const b = createBed();
    expect(quantity(b, "concrete")).toBe(supports(b).length);
    expect(quantity({ ...b, bases: false }, "concrete")).toBe(0);
  });
});
describe("Filas independientes y rieles", () => {
  it("girar toda la fila superior de 2×4 no mueve paneles, rieles ni patas inferiores", () => {
    const b = { ...createBed(), columns: 4 };
    const panels = Array.from({ length: 4 }, (_, c) => panelPlacement(b, 0, c)),
      rails = supportTracks(b).filter((t) => t.row === 0),
      legs = supports(b).filter((s) => s.row === 0);
    b.panelRotations = Object.fromEntries(
      Array.from({ length: 4 }, (_, c) => [panelKey(1, c), 90]),
    );
    expect(
      Array.from({ length: 4 }, (_, c) => panelPlacement(b, 0, c)),
    ).toEqual(panels);
    expect(supportTracks(b).filter((t) => t.row === 0)).toEqual(rails);
    expect(supports(b).filter((s) => s.row === 0)).toEqual(legs);
    const d = dimensions(b);
    for (let c = 1; c < 4; c++)
      expect(
        d.rowColumnCenters[0][c] -
          d.rowColumnWidths[0][c] / 2 -
          (d.rowColumnCenters[0][c - 1] + d.rowColumnWidths[0][c - 1] / 2),
      ).toBeCloseTo(0.02);
    expect(d.rowWidths[1]).toBeGreaterThan(d.rowWidths[0]);
  });
  it("la fila superior queda junto a la inferior, no sobre una cuadrícula compartida", () => {
    const b = { ...createBed(), columns: 4 };
    b.panelRotations = { "1:0": 90, "1:1": 90, "1:2": 90, "1:3": 90 };
    const d = dimensions(b);
    expect(
      d.rowCenters[1] -
        d.rowLengths[1] / 2 -
        (d.rowCenters[0] + d.rowLengths[0] / 2),
    ).toBeCloseTo(0.02);
    expect(d.rowWidths[0]).toBeCloseTo(4.62);
    expect(d.rowWidths[1]).toBeCloseTo(9.58);
  });
  it("las uniones N–S sólo cruzan el ancho compartido de las filas", () => {
    const b = { ...createBed(), columns: 4 };
    b.panelRotations = { "1:0": 90, "1:1": 90, "1:2": 90, "1:3": 90 };
    const d = dimensions(b);
    for (const t of supportTracks(b).filter(
      (t) => t.axis === "z" && !t.panelMount,
    )) {
      expect(t.fixed).toBeGreaterThanOrEqual(d.minX - 1e-7);
      expect(t.fixed).toBeLessThanOrEqual(d.minX + d.rowWidths[0] + 1e-7);
    }
  });
  it("los giros arbitrarios conservan la separación dentro de cada fila", () => {
    const b = createBed();
    b.panelRotations = { "0:0": 45, "1:1": 120 };
    const d = dimensions(b);
    for (let r = 0; r < b.rows; r++)
      for (let c = 1; c < b.columns; c++)
        expect(
          d.rowColumnCenters[r][c] -
            d.rowColumnWidths[r][c] / 2 -
            (d.rowColumnCenters[r][c - 1] + d.rowColumnWidths[r][c - 1] / 2),
        ).toBeCloseTo(0.02);
  });
  it("cambiar orientación global conserva el área del panel", () => {
    const b = createBed(),
      a = dimensions(b),
      c = dimensions({ ...b, orientation: "landscape" });
    expect(a.w * a.l).toBeCloseTo(c.w * c.l);
  });
});
describe("Patas limitadas al eje del riel", () => {
  it("el movimiento E–O no puede sacar la pata de su línea N–S", () => {
    const b = createBed(),
      first = supports(b)[0];
    b.supportOverrides = {
      [first.id]: snapSupport(b, first.id, first.x + 0.2, first.z + 0.8),
    };
    const moved = supports(b)[0];
    expect(moved.x).toBeCloseTo(first.x + 0.2);
    expect(moved.z).toBe(first.z);
    expect(moved.length).toBe(first.length);
  });
  it("en un riel N–S la X permanece fija y cambia la longitud", () => {
    const b = createBed(),
      first = supports(b)[0],
      track = supportTracks(b).find((t) => t.axis === "z")!;
    b.supportOverrides = {
      [first.id]: snapSupport(b, first.id, first.x, 0, track.id),
    };
    const a = supports(b)[0];
    b.supportOverrides[first.id] = snapSupport(b, first.id, a.x + 3, 0.4);
    const z = supports(b)[0];
    expect(z.x).toBe(track.fixed);
    expect(z.z).toBe(0.4);
    expect(z.length - a.length).toBeCloseTo(-0.4 * Math.tan(dimensions(b).rad));
  });
  it("el arrastre se limita a los extremos del riel", () => {
    const b = createBed(),
      s = supports(b)[0],
      t = supportTracks(b).find((t) => t.id === s.trackId)!;
    b.supportOverrides = { [s.id]: snapSupport(b, s.id, 99, -99) };
    const a = supports(b)[0];
    expect(a.x).toBe(t.end);
    expect(a.z).toBe(t.fixed);
  });
  it("mover una pata no modifica las otras", () => {
    const b = createBed(),
      all = supports(b),
      s = all[0];
    b.supportOverrides = { [s.id]: snapSupport(b, s.id, s.x + 0.25, s.z) };
    expect(supports(b).slice(1)).toEqual(all.slice(1));
    delete b.supportOverrides[s.id];
    expect(supports(b)).toEqual(all);
  });
  it("la separación global N–S es horizontal y exacta cuando cabe", () => {
    const b = { ...createBed(), supportSpacingNS: 1 };
    const s = supports(b);
    expect(s[0].z - s[1].z).toBeCloseTo(1);
  });
  it("a cero grados las patas tienen igual altura", () => {
    const b = { ...createBed(), angle: 0 };
    expect(supports(b).every((s) => s.length === b.frontHeight)).toBe(true);
  });
  it("los proyectos antiguos conservan los dos apoyos al 20% y 80%", () => {
    const b = createBed();
    delete b.supportSpacingNS;
    const d = dimensions(b);
    expect(supports(b)[0].z).toBeCloseTo(
      d.frontZ - d.l * 0.2 * Math.cos(d.rad),
    );
  });
});
describe("Contravientos manuales, herrajes y T-Bolt", () => {
  it("no coloca diagonales por activar los parámetros antiguos de una cama nueva", () => {
    const b = { ...createBed(), bracingEnabled: true, bracingCount: 20 };
    expect(braces(b)).toHaveLength(0);
  });
  it("cada pata lleva L-Foot inferior y Tilt Plate superior con tres T-Bolt", () => {
    const b = createBed();
    expect(supports(b)).toHaveLength(24);
    expect(quantity(b, "lFoot")).toBe(24);
    expect(quantity(b, "tiltPlate")).toBe(24);
    expect(quantity(b, "tBolt")).toBe(72);
  });
  it("una diagonal E–O suma dos L-Foot y cuatro T-Bolt", () => {
    const b = addBrace(createBed(), "ew");
    expect(braces(b)).toHaveLength(1);
    expect(quantity(b, "lFoot")).toBe(26);
    expect(quantity(b, "tiltPlate")).toBe(24);
    expect(quantity(b, "tBolt")).toBe(76);
    expect(railBreakdown(b).bracing).toBe(2);
  });
  it("una diagonal N–S suma dos Tilt Plate y cuatro T-Bolt", () => {
    const b = addBrace(createBed(), "ns");
    expect(braces(b)).toHaveLength(1);
    expect(quantity(b, "lFoot")).toBe(24);
    expect(quantity(b, "tiltPlate")).toBe(26);
    expect(quantity(b, "tBolt")).toBe(76);
    expect(railBreakdown(b).bracing).toBe(1);
  });
  it("dos diagonales X mantienen sus extremos y suman ambas", () => {
    const b = addBrace(addBrace(createBed(), "ew"), "ew", true);
    const q = braces(b);
    expect(q).toHaveLength(2);
    expect(q[0].from[0]).toBe(q[1].to[0]);
    expect(quantity(b, "tBolt")).toBe(80);
  });
  it("no cuenta uniones a patas ausentes o desalineadas", () => {
    const b = addBrace(createBed(), "ns"),
      s = supports(b)[0];
    b.supportOverrides = { [s.id]: snapSupport(b, s.id, s.x + 0.3, s.z) };
    expect(braces(b)).toHaveLength(0);
    expect(braceConnections(b)).toHaveLength(1);
  });
  it("conserva las diagonales antiguas al importar, pero como uniones explícitas", () => {
    const p = createProject(),
      b = p.beds[0];
    delete b.manualBraces;
    b.bracingEnabled = true;
    b.bracingCount = 2;
    const imported = validateProject(JSON.parse(JSON.stringify(p)));
    expect(imported.beds[0].manualBraces).toHaveLength(2);
    expect(braces(imported.beds[0])).toHaveLength(2);
  });
  it("puede editarse el material final y restablecer el cálculo de T-Bolt", () => {
    const b = addBrace(createBed(), "ew");
    b.overrides = { lFoot: 30, tiltPlate: 35 };
    expect(quantity(b, "tBolt")).toBe(102);
    b.overrides.tBolt = 7;
    expect(quantity(b, "tBolt")).toBe(7);
    delete b.overrides.tBolt;
    expect(quantity(b, "tBolt")).toBe(102);
  });
  it("el total de riel puede fijarse manualmente sin perder sus datos", () => {
    const b = createBed();
    b.overrides = { rail: 99 };
    const a = quantity(b, "rail");
    b.nsMode = "exclude";
    expect(quantity(b, "rail")).toBe(a);
    expect(calculate(b).find((m) => m.id === "rail")!.overridden).toBe(true);
  });
  it("mantiene ajustes antiguos de rieles agrupados", () => {
    const b = createBed();
    b.overrides = { railEW: 9, railNS: 6 };
    expect(quantity(b, "rail")).toBe(15);
    b.overrides.rail = 12;
    expect(quantity(b, "rail")).toBe(12);
  });
});
describe("Escala por referencias de techo", () => {
  it("una medida conserva la proporción de la foto", () => {
    const r = calibrateRoof(roof(), [
      {
        id: "a",
        from: { x: 0.1, y: 0.2 },
        to: { x: 0.6, y: 0.2 },
        distance: 5,
      },
    ]);
    expect(r.width).toBeCloseTo(10);
    expect(r.length).toBeCloseTo(5);
  });
  it("dos medidas independientes ajustan ambos ejes", () => {
    const r = calibrateRoof(roof(), [
      {
        id: "a",
        from: { x: 0.1, y: 0.2 },
        to: { x: 0.6, y: 0.2 },
        distance: 5,
      },
      {
        id: "b",
        from: { x: 0.2, y: 0.1 },
        to: { x: 0.2, y: 0.6 },
        distance: 4,
      },
    ]);
    expect(r.width).toBeCloseTo(10);
    expect(r.length).toBeCloseTo(8);
  });
  it("rechaza referencias paralelas que no determinan ambos ejes", () => {
    expect(() =>
      calibrateRoof(roof(), [
        { id: "a", from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, distance: 5 },
        { id: "b", from: { x: 0, y: 0.5 }, to: { x: 1, y: 0.5 }, distance: 5 },
      ]),
    ).toThrow();
  });
  it("rechaza puntos iguales y escalas fuera de rango", () => {
    expect(() =>
      calibrateRoof(roof(), [
        {
          id: "a",
          from: { x: 0.1, y: 0.1 },
          to: { x: 0.1, y: 0.1 },
          distance: 5,
        },
      ]),
    ).toThrow();
    expect(() =>
      calibrateRoof(roof(), [
        { id: "a", from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, distance: 500 },
      ]),
    ).toThrow();
  });
});
describe("Camas y compatibilidad de proyectos", () => {
  it("mover una cama no cambia sus coordenadas locales ni otra cama", () => {
    const p = createProject(),
      b = createBed(2);
    b.position = { x: 12, z: 4 };
    p.beds.push(b);
    const old = supports(p.beds[0]);
    p.beds[1].position = { x: 20, z: -3 };
    expect(supports(p.beds[0])).toEqual(old);
    expect(bedPose(p, 1)).toEqual({ x: 20, z: -3, rotation: 0 });
  });
  it("el encuadre incluye la rotación de cama", () => {
    const p = createProject(),
      b = p.beds[0],
      d = dimensions(b);
    b.position = { x: 10, z: 20 };
    b.azimuth = 90;
    const box = projectBounds(p);
    expect(box.centerX).toBeCloseTo(10);
    expect(box.centerZ).toBeCloseTo(20);
    expect(box.maxX - box.minX).toBeCloseTo(d.depth);
    expect(box.maxZ - box.minZ).toBeCloseTo(d.width);
  });
  it("conserva campos nuevos en una copia JSON", () => {
    const p = createProject();
    p.roof = roof();
    p.beds[0].panelRotations = { "1:0": 90 };
    addBrace(p.beds[0], "ew");
    const decoded = validateProject(JSON.parse(JSON.stringify(p)));
    expect(decoded).toEqual(p);
  });
  it("asigna ubicaciones a proyectos antiguos sin alterar sus paneles", () => {
    const p = createProject();
    delete p.beds[0].position;
    delete p.beds[0].azimuth;
    const b = createBed(2);
    delete b.position;
    p.beds.push(b);
    const decoded = validateProject(JSON.parse(JSON.stringify(p)));
    expect(decoded.beds[0].position).toEqual({ x: 0, z: 0 });
    expect(decoded.beds[1].position!.x).toBeGreaterThan(0);
    expect(activeCount(decoded.beds[0])).toBe(12);
  });
  it("suma materiales de todas las camas sin precios", () => {
    const p = createProject();
    p.beds.push(createBed(2));
    const all = aggregate(p);
    expect(all.find((m) => m.id === "rail")!.quantity).toBe(40);
    expect(all.find((m) => m.id === "ground")!.quantity).toBe(2);
    expect(all.every((m) => !("price" in m))).toBe(true);
  });
  it("rechaza posiciones, giros, cantidades y referencias inválidas", () => {
    const p = createProject();
    p.beds[0].position = { x: NaN, z: 0 };
    expect(() => validateProject(p)).toThrow();
    p.beds[0].position = { x: 0, z: 0 };
    p.beds[0].panelRotations = { "0:0": 360 };
    expect(() => validateProject(p)).toThrow();
    p.beds[0].panelRotations = {};
    p.beds[0].overrides = { lFoot: -1 };
    expect(() => validateProject(p)).toThrow();
  });
  it("no acepta imágenes remotas ni SVG como fondo", () => {
    const p = createProject();
    p.roof = { ...roof(), dataUrl: "https://example.com/roof.jpg" };
    expect(() => validateProject(p)).toThrow();
    p.roof.dataUrl =
      "data:image/png;base64," + btoa('<svg onload="alert(1)"></svg>');
    expect(() => validateProject(p)).toThrow();
  });
});

describe("Elección de rieles, abrazaderas y cuadrícula", () => {
  it("el perfil vertical no aparece en materiales, pero las patas conservan bases y herrajes", () => {
    const b = createBed();
    b.overrides.leg = 500;
    expect(calculate(b).some((m) => m.id === "leg")).toBe(false);
    expect(quantity(b, "concrete")).toBe(supports(b).length);
    const p = createProject();
    p.beds = [b];
    expect(() => validateProject(p)).not.toThrow();
  });
  for (const rows of [1, 2, 3])
    for (const ew of ["include", "exclude"] as const)
      for (const ns of ["include", "exclude"] as const) {
        it(`respeta elección E–O ${ew} / N–S ${ns} con ${rows} filas`, () => {
          const b: Bed = { ...createBed(), rows, ewMode: ew, nsMode: ns };
          const q = railBreakdown(b);
          expect(q.eastWest > 0).toBe(ew === "include");
          expect(q.northSouth > 0).toBe(ns === "include");
          if (ew === "exclude" || ns === "exclude") expect(q.beamClip).toBe(0);
          if (ew === "exclude") expect(panelClamps(b)).toHaveLength(0);
          if (ew === "exclude" && ns === "exclude")
            expect(supports(b)).toHaveLength(0);
        });
      }
  it("los clamps verticales se ubican sólo sobre rieles E–O", () => {
    const b = createBed(),
      d = dimensions(b);
    const clamps = panelClamps(b),
      tracks = supportTracks(b);
    expect(clamps).toHaveLength(28);
    for (const c of clamps) {
      expect(c.axis).toBe("x");
      expect(
        tracks.some(
          (t) =>
            t.axis === "x" &&
            Math.abs(t.fixed - (d.frontZ - c.distance * Math.cos(d.rad))) <
              1e-6 &&
            c.x >= t.start - 1e-6 &&
            c.x <= t.end + 1e-6,
        ),
      ).toBe(true);
    }
  });
  it("paneles horizontales comparten mid clamp entre filas sobre N–S", () => {
    const b: Bed = {
      ...createBed(),
      orientation: "landscape",
      columns: 4,
      ewMode: "exclude",
    };
    expect(panelClamps(b).every((c) => c.axis === "z")).toBe(true);
    expect(quantity(b, "midClamp")).toBe(8);
    expect(quantity(b, "endClamp")).toBe(16);
    expect(quantity({ ...b, nsMode: "exclude" }, "endClamp")).toBe(0);
    b.removed = ["0:0"];
    expect(quantity(b, "midClamp")).toBe(6);
    expect(quantity(b, "endClamp")).toBe(16);
  });
  it("un giro individual de 90° cambia sólo los clamps de ese panel a N–S", () => {
    const b = { ...createBed(), columns: 2 };
    b.panelRotations = { "1:0": 90 };
    const clamps = panelClamps(b);
    expect(clamps.filter((c) => c.axis === "z")).toHaveLength(4);
    expect(clamps.filter((c) => c.axis === "x")).toHaveLength(10);
    expect(calculate(b).find((m) => m.id === "midClamp")!.quantity).toBe(2);
  });
  it("la cuadrícula 4×2 abarca toda una cama de tres filas sin modificar paneles", () => {
    const b: Bed = {
      ...createBed(),
      rows: 3,
      supportGrid: { eastWest: 4, northSouth: 2 },
    };
    const legs = supports(b),
      d = dimensions(b);
    expect(legs).toHaveLength(8);
    expect(new Set(legs.map((s) => s.z)).size).toBe(2);
    expect(
      Math.max(...legs.map((s) => s.z)) - Math.min(...legs.map((s) => s.z)),
    ).toBeCloseTo((d.length - 0.4) * Math.cos(d.rad));
    expect(dimensions({ ...b, supportGrid: undefined })).toEqual(d);
    expect(railBreakdown(b).eastWest).toBeGreaterThan(
      railBreakdown({ ...b, supportGrid: undefined }).eastWest,
    );
    expect(quantity(b, "tBolt")).toBe(24);
  });
  it("cuadrícula N–S funciona cuando sólo se eligen rieles N–S", () => {
    const b: Bed = {
      ...createBed(),
      ewMode: "exclude",
      supportGrid: { eastWest: 3, northSouth: 4 },
    };
    expect(supports(b)).toHaveLength(12);
    expect(supports(b).every((s) => s.axis === "z")).toBe(true);
    expect(railBreakdown(b).eastWest).toBe(0);
  });
  it("quitar y añadir una pata actualiza longitud, herrajes, bloques y contravientos", () => {
    const b: Bed = {
      ...createBed(),
      supportGrid: { eastWest: 4, northSouth: 2 },
    };
    addBrace(b, "ew");
    const before = supports(b),
      removed = before[0];
    b.removedSupports = [removed.id];
    expect(supports(b)).toHaveLength(7);
    expect(braces(b)).toHaveLength(0);
    expect(quantity(b, "lFoot")).toBe(7);
    expect(quantity(b, "tiltPlate")).toBe(7);
    expect(quantity(b, "tBolt")).toBe(21);
    const t = supportTracks(b)[0];
    b.extraSupports = [
      { id: "extra:test", trackId: t.id, x: (t.start + t.end) / 2, z: t.fixed },
    ];
    expect(supports(b)).toHaveLength(8);
    expect(quantity(b, "concrete")).toBe(8);
    const extra = supports(b).find((s) => s.id === "extra:test")!;
    expect(extra.trackId).toBe(t.id);
    expect(extra.length).toBeGreaterThan(0);
    b.extraSupports[0].x = 999;
    expect(supports(b).find((s) => s.id === "extra:test")!.x).toBe(t.end);
    b.removedSupports = [];
    expect(supports(b)).toHaveLength(9);
    expect(braces(b)).toHaveLength(1);
  });
  it("guarda cuadrícula, patas extra, ubicación y logo en el proyecto", () => {
    const p = createProject(),
      b = p.beds[0];
    b.supportGrid = { eastWest: 3, northSouth: 2 };
    b.removedSupports = [supports(b)[0].id];
    const t = supportTracks(b)[0];
    b.extraSupports = [
      { id: "extra:keep", trackId: t.id, x: t.start, z: t.fixed },
    ];
    p.location = "Mérida, Yucatán";
    const imported = validateProject(JSON.parse(JSON.stringify(p)));
    expect(supports(imported.beds[0])).toEqual(supports(b));
    expect(imported.location).toBe(p.location);
    expect(() =>
      validateProject({
        ...p,
        brandLogo: {
          dataUrl: "data:image/svg+xml;base64,abc",
          name: "logo.svg",
        },
      }),
    ).toThrow();
    b.supportGrid.eastWest = 0;
    expect(() => validateProject(p)).toThrow();
  });
});

describe("Sujeción sobre bordes reales del panel", () => {
  it("un giro de 180° conserva mid clamps compartidos con paneles sin girar", () => {
    const b = {
      ...createBed(),
      rows: 1,
      columns: 2,
      panelRotations: { "0:1": 180 },
    };
    expect(quantity(b, "midClamp")).toBe(2);
    expect(quantity(b, "endClamp")).toBe(4);
  });
  it("un giro oblicuo ubica cada clamp sobre un borde largo real", () => {
    const b = {
      ...createBed(),
      rows: 1,
      columns: 1,
      panelRotations: { "0:0": 20 },
    };
    const d = dimensions(b),
      a = (20 * Math.PI) / 180,
      clamps = panelClamps(b);
    expect(clamps.length).toBeGreaterThan(0);
    for (const c of clamps) {
      const x = c.x - d.rowColumnCenters[0][0],
        z = c.distance - d.rowCenters[0];
      expect(Math.abs(x * Math.cos(a) + z * Math.sin(a))).toBeCloseTo(
        b.panelWidth / 2,
      );
      expect(Math.abs(-x * Math.sin(a) + z * Math.cos(a))).toBeLessThanOrEqual(
        b.panelLength / 2 + 1e-6,
      );
    }
  });
});
