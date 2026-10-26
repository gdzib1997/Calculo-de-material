import { test, expect } from "@playwright/test";
import {
  dimensions,
  supports,
  supportTracks,
  panelPlacement,
  bedPose,
} from "../src/lib/model";
import { PerspectiveCamera, Vector3 } from "three";
import ExcelJS from "exceljs";
import type { Project } from "../src/lib/model";
import type { Page } from "@playwright/test";
async function project(page: Page): Promise<Project> {
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("unirack-studio-project-v1")!),
  );
}
async function roofPhoto(page: Page) {
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 200;
    const x = c.getContext("2d")!;
    x.fillStyle = "#c44832";
    x.fillRect(0, 0, 400, 200);
    x.fillStyle = "#e9c997";
    x.fillRect(25, 25, 70, 70);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByRole("button", { name: "Techo", exact: true }).click();
  await page.getByLabel("Imagen del techo", { exact: true }).setInputFiles({
    name: "mi-techo.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await expect(
    page.getByAltText("Foto de techo cargada", { exact: true }),
  ).toBeVisible();
}
async function screenPoint(page: Page, point: Vector3) {
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const rect = await page.locator("canvas").boundingBox();
  const fit = await page.locator(".scene").evaluate((e) => ({
    x: Number((e as HTMLElement).dataset.fitX),
    z: Number((e as HTMLElement).dataset.fitZ),
    span: Number((e as HTMLElement).dataset.fitSpan),
  }));
  const camera = new PerspectiveCamera(
    38,
    rect!.width / rect!.height,
    0.1,
    1500,
  );
  camera.position.set(fit.x, fit.span * 0.24 + 0.5, fit.z + fit.span * 1.3);
  camera.lookAt(fit.x, 0.5, fit.z);
  camera.updateMatrixWorld();
  const p = point.project(camera);
  return {
    x: rect!.x + ((p.x + 1) * rect!.width) / 2,
    y: rect!.y + ((1 - p.y) * rect!.height) / 2,
  };
}

test("regresión 2×4: girar arriba no abre huecos ni mueve la fila inferior", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("spinbutton", { name: "Columnas", exact: true })
    .fill("4");
  const before = await project(page),
    bottom = Array.from({ length: 4 }, (_, c) =>
      panelPlacement(before.beds[0], 0, c),
    ),
    legs = supports(before.beds[0]).filter((s) => s.row === 0);
  await page
    .getByRole("button", { name: "Girar paneles en 3D", exact: true })
    .click();
  for (let c = 0; c < 4; c++) {
    await page
      .getByRole("combobox", { name: "Panel individual", exact: true })
      .selectOption(`1:${c}`);
    await page.getByRole("button", { name: "Girar 90°", exact: true }).click();
  }
  const after = await project(page),
    b = after.beds[0];
  expect(Array.from({ length: 4 }, (_, c) => panelPlacement(b, 0, c))).toEqual(
    bottom,
  );
  expect(supports(b).filter((s) => s.row === 0)).toEqual(legs);
  const d = dimensions(b);
  expect(d.rowWidths[0]).toBeCloseTo(4.62);
  expect(d.rowWidths[1]).toBeCloseTo(9.58);
  await page.reload();
  await page.getByRole("button", { name: "Paneles", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Panel individual", exact: true })
    .selectOption("1:3");
  await expect(
    page.getByRole("spinbutton", { name: "Giro del panel", exact: true }),
  ).toHaveValue("90");
});

test("cada pata sólo se desplaza sobre su riel E–O o N–S", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Patas y bases", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Posición de pata N–S", exact: true }),
  ).toBeDisabled();
  const before = await project(page),
    leg = supports(before.beds[0])[0];
  await page
    .getByRole("spinbutton", { name: "Posición de pata E–O", exact: true })
    .fill("-2.5");
  const changed = await project(page);
  expect(supports(changed.beds[0])[0].z).toBe(leg.z);
  const option = await page
    .getByRole("combobox", { name: "Riel de desplazamiento", exact: true })
    .locator("option")
    .evaluateAll(
      (options) =>
        (options as HTMLOptionElement[]).find((o) => o.value.startsWith("ns:"))!
          .value,
    );
  await page
    .getByRole("combobox", { name: "Riel de desplazamiento", exact: true })
    .selectOption(option);
  await expect(
    page.getByRole("spinbutton", { name: "Posición de pata E–O", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("spinbutton", { name: "Posición de pata N–S", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("spinbutton", { name: "Posición de pata N–S", exact: true })
    .fill("0.5");
  const final = await project(page),
    moved = supports(final.beds[0])[0];
  expect(moved.z).toBe(0.5);
  expect(moved.x).toBe(
    supportTracks(final.beds[0]).find((t) => t.id === option)!.fixed,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Patas y bases", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Riel de desplazamiento", exact: true }),
  ).toHaveValue(option);
});

test("el arrastre 3D mantiene el eje del riel y no modifica otras patas", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Mover patas en 3D", exact: true })
    .click();
  await page.getByRole("button", { name: "Frontal", exact: true }).click();
  const data = await project(page),
    b = data.beds[0],
    all = supports(b),
    leg = all[0];
  const p = await screenPoint(
    page,
    new Vector3(leg.x, (b.bases ? b.baseHeight : 0) + leg.length / 2, leg.z),
  );
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 40, p.y + 20, { steps: 12 });
  await page.mouse.up();
  const after = await project(page),
    changed = supports(after.beds[0]);
  expect(changed[0].x).not.toBeCloseTo(leg.x, 2);
  expect(changed[0].z).toBe(leg.z);
  expect(changed.slice(1)).toEqual(all.slice(1));
});

test("contravientos elegidos entre patas suman L-Foot/Tilt Plate y T-Bolt", async ({
  page,
}) => {
  await page.goto("/");
  const data = await project(page),
    all = supports(data.beds[0]),
    first = all[0],
    last = all
      .filter((s) => s.row === first.row && s.line === first.line)
      .at(-1)!;
  await page
    .getByRole("button", { name: "Contravientos", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Número de diagonales", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", {
      name: "Pata de origen del contraviento",
      exact: true,
    })
    .selectOption(first.id);
  await page
    .getByRole("combobox", {
      name: "Pata de destino del contraviento",
      exact: true,
    })
    .selectOption(last.id);
  await page
    .getByRole("button", { name: "Agregar contraviento", exact: true })
    .click();
  await page
    .getByRole("combobox", {
      name: "Pata de origen del contraviento",
      exact: true,
    })
    .selectOption(first.id);
  await page
    .getByRole("combobox", {
      name: "Pata de destino del contraviento",
      exact: true,
    })
    .selectOption(all[1].id);
  await page
    .getByRole("button", { name: "Agregar contraviento", exact: true })
    .click();
  await expect(page.locator(".brace-row")).toHaveCount(2);
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad L-Foot", exact: true }),
  ).toHaveValue("26");
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad Tilt Plate", exact: true }),
  ).toHaveValue("26");
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad T-Bolt", exact: true }),
  ).toHaveValue("80");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("23");
});

test("permite seleccionar dos patas en 3D para colocar una diagonal", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Contravientos en 3D", exact: true })
    .click();
  await page.getByRole("button", { name: "Frontal", exact: true }).click();
  const data = await project(page),
    b = data.beds[0],
    all = supports(b),
    legs = [all[0], all[2]];
  for (const leg of legs) {
    const p = await screenPoint(
      page,
      new Vector3(leg.x, (b.bases ? b.baseHeight : 0) + leg.length / 2, leg.z),
    );
    await page.mouse.click(p.x, p.y);
  }
  await expect(page.locator(".brace-row")).toHaveCount(1);
  const saved = await project(page);
  expect(saved.beds[0].manualBraces?.[0].fromId).toBe(legs[0].id);
  expect(saved.beds[0].manualBraces?.[0].toId).toBe(legs[1].id);
});

test("mueve una cama sin alterar otra y desplaza la cámara sin mover objetos", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Agregar cama", exact: true }).click();
  await expect(page.locator(".bed-scene-label")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Acomodar camas", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Posición de cama E–O", exact: true })
    .fill("12");
  await page
    .getByRole("spinbutton", { name: "Posición de cama N–S", exact: true })
    .fill("2");
  const before = await project(page);
  expect(before.beds[0].position).toEqual({ x: 0, z: 0 });
  expect(before.beds[1].position).toEqual({ x: 12, z: 2 });
  await page.getByRole("button", { name: "Frontal", exact: true }).click();
  const b = before.beds[1],
    d = dimensions(b),
    pose = bedPose(before, 1),
    p = await screenPoint(
      page,
      new Vector3(
        pose.x + d.centerX,
        (b.bases ? b.baseHeight : 0) +
          b.frontHeight +
          (d.length / 2) * Math.sin(d.rad),
        pose.z + d.centerZ,
      ),
    );
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 50, p.y, { steps: 12 });
  await page.mouse.up();
  const moved = await project(page);
  expect(moved.beds[0].position).toEqual(before.beds[0].position);
  expect(moved.beds[1].position?.x).not.toBeCloseTo(12, 2);
  await page
    .getByRole("button", { name: "Desplazar vista", exact: true })
    .click();
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const rect = await page.locator("canvas").boundingBox(),
    imageBefore = await page.locator("canvas").screenshot();
  await page.mouse.move(rect!.x + 80, rect!.y + rect!.height - 70);
  await page.mouse.down();
  await page.mouse.move(rect!.x + 140, rect!.y + rect!.height - 100, {
    steps: 10,
  });
  await page.mouse.up();
  const after = await project(page),
    imageAfter = await page.locator("canvas").screenshot();
  expect(after.beds.map((b) => b.position)).toEqual(
    moved.beds.map((b) => b.position),
  );
  expect(imageBefore.equals(imageAfter)).toBe(false);
});

test("escala el techo con una o dos medidas reales y conserva las referencias", async ({
  page,
}) => {
  await page.goto("/");
  await roofPhoto(page);
  await page
    .getByRole("button", {
      name: "Escalar con medidas de referencia",
      exact: true,
    })
    .click();
  const svg = page.getByRole("img", {
    name: "Foto para marcar referencia",
    exact: true,
  });
  async function point(x: number, y: number) {
    const p = await svg.evaluate(
      (element, xy) => {
        const s = element as SVGSVGElement,
          p = s.createSVGPoint();
        p.x = xy.x * s.viewBox.baseVal.width;
        p.y = xy.y * s.viewBox.baseVal.height;
        const q = p.matrixTransform(s.getScreenCTM()!);
        return { x: q.x, y: q.y };
      },
      { x, y },
    );
    await page.mouse.click(p.x, p.y);
  }
  await point(0.1, 0.2);
  await point(0.6, 0.2);
  await page
    .getByRole("spinbutton", {
      name: "Medida real de la referencia",
      exact: true,
    })
    .fill("5");
  await page
    .getByRole("button", { name: "Aplicar referencia", exact: true })
    .click();
  await expect(
    page.getByText("Escala actual: 10.000 × 5.000 m", { exact: true }),
  ).toBeVisible();
  await point(0.2, 0.1);
  await point(0.2, 0.6);
  await page
    .getByRole("spinbutton", {
      name: "Medida real de la referencia",
      exact: true,
    })
    .fill("4");
  await page
    .getByRole("button", { name: "Aplicar referencia", exact: true })
    .click();
  await expect(
    page.getByText("Escala actual: 10.000 × 8.000 m", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar calibración", exact: true })
    .click();
  const data = await project(page);
  expect(data.roof!.references).toHaveLength(2);
  expect(data.roof!.width).toBeCloseTo(10);
  expect(data.roof!.length).toBeCloseTo(8);
  await page.getByRole("button", { name: "Exportar", exact: false }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: /Libro de Excel/ }).click();
  const dl = await pending;
  await dl.saveAs("/tmp/unirack-v03-roof.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("/tmp/unirack-v03-roof.xlsx");
  expect(workbook.getWorksheet("Techo")!.getCell("B2").value).toBeCloseTo(10);
  expect(workbook.getWorksheet("Techo")!.getImages()).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: "Techo", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Escalar con medidas de referencia",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Escala actual: 10.000 × 8.000 m", { exact: true }),
  ).toBeVisible();
});

test("el fondo raster se ve en 3D y rechaza SVG disfrazado de imagen", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Techo", exact: true }).click();
  await page.getByLabel("Imagen del techo", { exact: true }).setInputFiles({
    name: "falso.png",
    mimeType: "image/png",
    buffer: Buffer.from('<svg onload="alert(1)"></svg>'),
  });
  await expect(page.getByRole("status")).toContainText("no coincide");
  await expect(
    page.getByAltText("Foto de techo cargada", { exact: true }),
  ).toHaveCount(0);
  await roofPhoto(page);
  await expect
    .poll(async () =>
      page.locator("canvas").evaluate((canvas) => {
        const source = canvas as HTMLCanvasElement,
          c = document.createElement("canvas");
        c.width = source.width;
        c.height = source.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(source, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4)
          if (d[i] > 120 && d[i] > d[i + 1] * 1.4 && d[i] > d[i + 2] * 1.4) n++;
        return n;
      }),
    )
    .toBeGreaterThan(1000);
  await page.screenshot({ path: "/tmp/unirack-v03-roof.png", fullPage: true });
  expect(errors).toEqual([]);
});
