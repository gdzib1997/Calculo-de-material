import { test, expect } from "@playwright/test";
import { dimensions, supports } from "../src/lib/model";
import { PerspectiveCamera, Vector3 } from "three";
import ExcelJS from "exceljs";
import type { Project } from "../src/lib/model";
async function project(
  page: import("@playwright/test").Page,
): Promise<Project> {
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("unirack-studio-project-v1")!),
  );
}

test("separación N–S, posiciones por pata y altura individual", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Estructura", exact: true }).click();
  await page
    .getByRole("spinbutton", {
      name: "Separación entre patas N–S por fila",
      exact: true,
    })
    .fill("1");
  await page
    .getByRole("button", { name: "Patas y bases", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Separación con pata opuesta N–S",
      exact: true,
    }),
  ).toHaveValue("1");
  const before = await project(page),
    original = supports(before.beds[0]);
  await page
    .getByRole("spinbutton", { name: "Posición de pata N–S", exact: true })
    .fill("1");
  await page
    .getByRole("spinbutton", { name: "Posición de pata E–O", exact: true })
    .fill("-2.5");
  const after = await project(page),
    moved = supports(after.beds[0]);
  expect(moved[0].x).toBe(-2.5);
  expect(moved[0].z).toBe(1);
  expect(moved[0].length).not.toBe(original[0].length);
  expect(moved.slice(1)).toEqual(original.slice(1));
  await page.reload();
  await page
    .getByRole("button", { name: "Patas y bases", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Posición de pata E–O", exact: true }),
  ).toHaveValue("-2.5");
  await page
    .getByRole("button", { name: "Restablecer esta pata", exact: true })
    .click();
  const reset = await project(page);
  expect(supports(reset.beds[0])).toEqual(original);
});

test("gira cada panel, conserva el resto y recupera giros en JSON", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Girar paneles en 3D", exact: true })
    .click();
  await page.getByRole("button", { name: "Girar 90°", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Giro del panel", exact: true }),
  ).toHaveValue("90");
  await page
    .getByRole("combobox", { name: "Panel individual", exact: true })
    .selectOption("0:1");
  await expect(
    page.getByRole("spinbutton", { name: "Giro del panel", exact: true }),
  ).toHaveValue("0");
  await page
    .getByRole("spinbutton", { name: "Giro del panel", exact: true })
    .fill("45");
  const data = await project(page);
  expect(data.beds[0].panelRotations).toEqual({ "0:0": 90, "0:1": 45 });
  expect(dimensions(data.beds[0]).width).toBeGreaterThan(6.94);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Guardar proyecto", exact: true })
    .click();
  const dl = await pending;
  await dl.saveAs("/tmp/unirack-custom-geometry.json");
  await page.reload();
  await page.getByRole("button", { name: "Paneles", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Giro del panel", exact: true }),
  ).toHaveValue("90");
});

test("carga una foto real, la guarda, aparece en 3D y se incluye en Excel", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 300;
    c.height = 200;
    const x = c.getContext("2d")!;
    x.fillStyle = "#c44832";
    x.fillRect(0, 0, 300, 200);
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
  await page
    .getByRole("spinbutton", { name: "Ancho real del techo", exact: true })
    .fill("18");
  await page
    .getByRole("spinbutton", { name: "Giro de la imagen", exact: true })
    .fill("20");
  await expect
    .poll(async () =>
      page.locator("canvas").evaluate((canvas) => {
        const source = canvas as HTMLCanvasElement,
          c = document.createElement("canvas");
        c.width = source.width;
        c.height = source.height;
        const x = c.getContext("2d")!;
        x.drawImage(source, 0, 0);
        const data = x.getImageData(0, 0, c.width, c.height).data;
        let red = 0;
        for (let i = 0; i < data.length; i += 4)
          if (
            data[i] > 120 &&
            data[i] > data[i + 1] * 1.4 &&
            data[i] > data[i + 2] * 1.4
          )
            red++;
        return red;
      }),
    )
    .toBeGreaterThan(1000);
  const saved = await project(page);
  expect(saved.roof?.width).toBe(18);
  expect(saved.roof?.rotation).toBe(20);
  expect(saved.roof?.dataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
  await page
    .getByRole("button", { name: "Girar paneles en 3D", exact: true })
    .click();
  await page.getByRole("button", { name: "Girar 90°", exact: true }).click();
  await page.getByRole("button", { name: "Exportar", exact: false }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: /Libro de Excel/ }).click();
  const dl = await pending;
  await dl.saveAs("/tmp/unirack-custom-roof.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("/tmp/unirack-custom-roof.xlsx");
  expect(workbook.getWorksheet("Techo")!.getCell("B2").value).toBe(18);
  expect(workbook.getWorksheet("Paneles")!.getCell("E2").value).toBe(90);
  expect(workbook.getWorksheet("Techo")!.getImages()).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: "Techo", exact: true }).click();
  await expect(
    page.getByAltText("Foto de techo cargada", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: "Ancho real del techo", exact: true }),
  ).toHaveValue("18");
  await page.screenshot({ path: "/tmp/unirack-new-roof.png", fullPage: true });
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Quitar imagen del suelo", exact: true })
    .click();
  await expect(
    page.getByAltText("Foto de techo cargada", { exact: true }),
  ).toHaveCount(0);
});

test("arrastra una pata en 3D y sólo cambia su posición", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Mover patas en 3D", exact: true })
    .click();
  await page.getByRole("button", { name: "Frontal", exact: true }).click();
  const data = await project(page),
    bed = data.beds[0],
    d = dimensions(bed),
    legs = supports(bed),
    leg = legs[0];
  const bounds = await page.locator("canvas").boundingBox();
  const span = Math.max(d.width + bed.overhang * 2, d.length, 5),
    camera = new PerspectiveCamera(
      38,
      bounds!.width / bounds!.height,
      0.1,
      500,
    );
  camera.position.set(0, span * 0.24, span * 1.3);
  camera.lookAt(0, 0.5, 0);
  camera.updateMatrixWorld();
  const point = new Vector3(
    leg.x,
    (bed.bases ? bed.baseHeight : 0) + leg.length / 2,
    leg.z,
  ).project(camera);
  const x = bounds!.x + ((point.x + 1) * bounds!.width) / 2,
    y = bounds!.y + ((1 - point.y) * bounds!.height) / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y, { steps: 12 });
  await page.mouse.up();
  const after = await project(page),
    changed = supports(after.beds[0]);
  expect(changed[0].x).not.toBeCloseTo(leg.x, 2);
  expect(changed[0].moved).toBe(true);
  expect(changed.slice(1)).toEqual(legs.slice(1));
});

test("agrupa rieles, permite N–S opcional y suma contravientos con cotas de patas", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("31");
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad Beam Clip", exact: true }),
  ).toHaveValue("24");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel norte–sur",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Estructura", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Rieles norte–sur", exact: true })
    .selectOption("exclude");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("19");
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad Beam Clip", exact: true }),
  ).toHaveValue("0");
  await page
    .getByRole("combobox", { name: "Rieles norte–sur", exact: true })
    .selectOption("include");
  await page
    .getByRole("spinbutton", {
      name: "Beam Clip por cruce N–S / E–O",
      exact: true,
    })
    .fill("2");
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad Beam Clip", exact: true }),
  ).toHaveValue("48");
  await page
    .getByRole("switch", { name: "Contemplar contravientos", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("35");
  await page
    .getByRole("checkbox", {
      name: "Longitud automática de contravientos",
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("spinbutton", {
      name: "Longitud considerada por diagonal",
      exact: true,
    })
    .fill("5");
  await page
    .getByRole("spinbutton", { name: "Número de diagonales", exact: true })
    .fill("3");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("37");
  await page
    .getByRole("button", { name: "Mostrar medidas", exact: true })
    .click();
  await expect(
    page.locator(".dimension-label").filter({ hasText: /P-\d+ ·/ }),
  ).toHaveCount(24);
  const data = await project(page);
  expect(data.beds[0].bracingCount).toBe(3);
  expect(data.beds[0].nsMode).toBe("include");
});
