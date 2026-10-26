import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { createProject } from "../src/lib/model";

test("interfaz sin precios ni reglas y biblioteca de paneles persistente", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("20");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Puesta a tierra · Tierras",
      exact: true,
    }),
  ).toHaveValue("1");
  expect(await page.locator("body").innerText()).not.toMatch(
    /MXN|\$|Reglas y supuestos|P\. UNITARIO|IMPORTE/,
  );
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nombre del modelo de panel" })
    .fill("Panel de prueba");
  await page
    .getByRole("spinbutton", { name: "Ancho guardado", exact: true })
    .fill("1.2");
  await page
    .getByRole("spinbutton", { name: "Largo guardado", exact: true })
    .fill("2.5");
  await page
    .getByRole("button", { name: "Guardar modelo", exact: true })
    .click();
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Modelo de panel", exact: true })
    .selectOption({ label: "Panel de prueba" });
  await expect(
    page.getByRole("spinbutton", { name: "Ancho del panel", exact: true }),
  ).toHaveValue("1.2");
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "Largo del panel", exact: true }),
  ).toHaveValue("2.5");
  expect(errors).toEqual([]);
});

test("permite editar materiales finales y recalcula T-Bolt por herrajes", async ({
  page,
}) => {
  await page.goto("/");
  const foot = page.getByRole("spinbutton", {
      name: "Cantidad L-Foot",
      exact: true,
    }),
    bolts = page.getByRole("spinbutton", {
      name: "Cantidad T-Bolt",
      exact: true,
    });
  await expect(foot).toHaveValue("24");
  await expect(bolts).toHaveValue("72");
  await foot.fill("30");
  await expect(bolts).toHaveValue("78");
  await bolts.fill("123");
  await page
    .getByRole("button", { name: "Quitar paneles en 3D", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Panel fila 1 columna 1", exact: true })
    .click();
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(bolts).toHaveValue("123");
  await page
    .getByRole("button", { name: "Restablecer T-Bolt", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restablecer L-Foot", exact: true })
    .click();
  await expect(bolts).toHaveValue("66");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Puesta a tierra · Tierras",
      exact: true,
    }),
  ).toHaveValue("1");
});

test("exporta Word, PDF, Excel y JSON sin apartados monetarios", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Nombre del proyecto", exact: true })
    .fill("Proyecto actualizado");
  for (const [label, ext] of [
    ["Documento PDF", ".pdf"],
    ["Documento Word", ".docx"],
    ["Libro de Excel", ".xlsx"],
  ]) {
    await page.getByRole("button", { name: "Exportar", exact: false }).click();
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: new RegExp(label) }).click();
    const dl = await pending,
      path = `/tmp/unirack-v03${ext}`;
    await dl.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.length).toBeGreaterThan(2000);
    if (ext === ".pdf") expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    if (ext === ".xlsx") {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(path);
      expect(workbook.worksheets).toHaveLength(8);
      const sheet = workbook.getWorksheet("Materiales")!;
      expect(sheet.getRow(5).values).toEqual([
        ,
        "Material",
        "Cantidad",
        "Unidad",
        "Origen",
      ]);
      expect(sheet.getCell("B6").value).toBe(20);
      expect(sheet.getColumn(5).values.every((v) => v === undefined)).toBe(
        true,
      );
      expect(workbook.getWorksheet("Contravientos")).toBeTruthy();
      expect(workbook.getWorksheet("Perfiles")).toBeTruthy();
    }
  }
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Guardar proyecto", exact: true })
    .click();
  const dl = await pending;
  await dl.saveAs("/tmp/unirack-v03.json");
  expect(JSON.parse(await readFile("/tmp/unirack-v03.json", "utf8")).name).toBe(
    "Proyecto actualizado",
  );
});

test("recupera un proyecto anterior y conserva sus ajustes de material", async ({
  page,
}) => {
  const p = createProject();
  p.name = "Proyecto recuperado";
  p.prices = { railEW: 200 };
  p.beds[0].overrides = { railEW: 9, railNS: 6 };
  delete p.beds[0].position;
  delete p.beds[0].azimuth;
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "antiguo.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  await page
    .getByRole("button", { name: "Abrir proyecto", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nombre del proyecto", exact: true }),
  ).toHaveValue("Proyecto recuperado");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("15");
  await expect(page.getByRole("spinbutton", { name: /Precio/ })).toHaveCount(0);
});

test("suma una tierra por cama y permite ver todas las camas", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Agregar cama", exact: true }).click();
  await expect(page.locator(".bed-scene-label")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Alcance de materiales", exact: true })
    .selectOption("project");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Puesta a tierra · Tierras",
      exact: true,
    }),
  ).toHaveValue("2");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("40");
  await page
    .getByRole("button", { name: "Duplicar cama", exact: true })
    .click();
  await expect(page.locator(".bed-scene-label")).toHaveCount(3);
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Puesta a tierra · Tierras",
      exact: true,
    }),
  ).toHaveValue("3");
});

test("interfaz móvil sin desbordamiento y edición disponible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Paneles", exact: true }).click();
  await page
    .getByRole("button", { name: "Quitar / reponer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Panel fila 1 columna 2", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Panel fila 1 columna 2", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({
    path: "/tmp/unirack-v03-mobile.png",
    fullPage: true,
  });
});
