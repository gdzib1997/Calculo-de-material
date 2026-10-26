import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createProject } from "../src/lib/model";
import ExcelJS from "exceljs";
const { Workbook } = ExcelJS;

test("edición, biblioteca, guardado y recálculo completo", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: "Ancho del panel", exact: true }),
  ).toHaveValue("1.14");
  await expect(
    page.getByRole("spinbutton", { name: "Largo del panel", exact: true }),
  ).toHaveValue("2.38");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel este–oeste",
      exact: true,
    }),
  ).toHaveValue("19");
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nombre del modelo de panel" })
    .fill("Modelo de prueba 650 W");
  await page
    .getByRole("spinbutton", { name: "Ancho guardado", exact: true })
    .fill("1.2");
  await page
    .getByRole("spinbutton", { name: "Largo guardado", exact: true })
    .fill("2.5");
  await page
    .getByRole("button", { name: "Guardar modelo", exact: true })
    .click();
  await expect(
    page.getByText("Modelo guardado en la biblioteca."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  const options = await page
    .getByRole("combobox", { name: "Modelo de panel" })
    .locator("option")
    .all();
  const id = await options[options.length - 1].getAttribute("value");
  await page
    .getByRole("combobox", { name: "Modelo de panel" })
    .selectOption(id!);
  await expect(
    page.getByRole("spinbutton", { name: "Ancho del panel", exact: true }),
  ).toHaveValue("1.2");
  await expect(
    page.getByRole("spinbutton", { name: "Largo del panel", exact: true }),
  ).toHaveValue("2.5");
  await page
    .getByRole("spinbutton", {
      name: "Cantidad Abrazadera intermedia · Mid Clamp",
      exact: true,
    })
    .fill("77");
  await page.getByRole("button", { name: "Paneles", exact: true }).click();
  await page
    .getByRole("button", { name: "Panel fila 1 columna 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Panel fila 1 columna 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Abrazadera intermedia · Mid Clamp",
      exact: true,
    }),
  ).toHaveValue("77");
  await page
    .getByRole("button", {
      name: "Restablecer Abrazadera intermedia · Mid Clamp",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Abrazadera intermedia · Mid Clamp",
      exact: true,
    }),
  ).toHaveValue("16");
  await page.getByRole("spinbutton", { name: "Filas", exact: true }).fill("1");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel norte–sur",
      exact: true,
    }),
  ).toHaveValue("0");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel norte–sur",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("spinbutton", { name: "Ángulo exacto", exact: true })
    .fill("25");
  await page.getByRole("button", { name: "Estructura", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Longitud comercial del riel",
      exact: true,
    }),
  ).toHaveValue("4.7");
  await expect(
    page.getByRole("spinbutton", {
      name: "Sobrante para end clamp",
      exact: true,
    }),
  ).toHaveValue("0.05");
  await page.getByRole("switch", { name: "Bases de concreto" }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Bloque de concreto sólido",
      exact: true,
    }),
  ).toHaveValue("0");
  await page.waitForTimeout(600);
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "Filas", exact: true }),
  ).toHaveValue("1");
  await expect(
    page.getByRole("spinbutton", { name: "Ángulo exacto", exact: true }),
  ).toHaveValue("25");
  await expect(
    page.getByRole("spinbutton", { name: "Ancho del panel", exact: true }),
  ).toHaveValue("1.2");
  await expect(
    page.getByRole("combobox", { name: "Modelo de panel" }),
  ).toHaveValue(id!);
  expect(errors).toEqual([]);
});

test("exporta archivos Word, PDF, Excel y JSON con datos reales", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Nombre del proyecto", exact: true })
    .fill("Prueba de exportación");
  await page
    .getByRole("textbox", { name: "Cliente u obra", exact: true })
    .fill("Obra de validación");
  await page
    .getByRole("spinbutton", { name: "Precio Riel este–oeste", exact: true })
    .fill("200");
  for (const [name, extension] of [
    ["Documento PDF", ".pdf"],
    ["Documento Word", ".docx"],
    ["Libro de Excel", ".xlsx"],
  ]) {
    await page.getByRole("button", { name: "Exportar", exact: false }).click();
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: new RegExp(name) }).click();
    const dl = await pending;
    expect(dl.suggestedFilename()).toBe(`Prueba de exportación${extension}`);
    const path = `/tmp/unirack-report${extension}`;
    await dl.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.byteLength).toBeGreaterThan(2000);
    if (extension === ".pdf")
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    else expect(bytes.subarray(0, 2).toString()).toBe("PK");
    if (extension === ".xlsx") {
      const wb = new Workbook();
      await wb.xlsx.readFile(path);
      expect(wb.worksheets).toHaveLength(6);
      expect(wb.getWorksheet("Materiales")!.getCell("A1").value).toBe(
        "Prueba de exportación",
      );
      expect(wb.getWorksheet("Materiales")!.getCell("B7").value).toBe(19);
      expect(wb.getWorksheet("Materiales")!.getCell("F7").value).toMatchObject({
        result: 3800,
      });
      expect(wb.getWorksheet("Patas y bloques")!.rowCount).toBeGreaterThan(2);
    }
  }
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Guardar proyecto", exact: true })
    .click();
  const dl = await pending;
  await dl.saveAs("/tmp/unirack-project.json");
  const data = JSON.parse(await readFile("/tmp/unirack-project.json", "utf8"));
  expect(data.prices.railEW).toBe(200);
  expect(data.panelLibrary[0].width).toBe(1.14);
});

test("el proyecto importado restaura biblioteca, medidas y materiales", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir", exact: true }).click();
  const fixture = createProject();
  fixture.name = "Prueba de exportación";
  fixture.prices = { railEW: 200 };
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "proyecto.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(fixture)),
    });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Abrir proyecto", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Nombre del proyecto", exact: true }),
  ).toHaveValue("Prueba de exportación");
  await expect(
    page.getByRole("spinbutton", {
      name: "Precio Riel este–oeste",
      exact: true,
    }),
  ).toHaveValue("200");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel este–oeste",
      exact: true,
    }),
  ).toHaveValue("19");
});

test("agrega camas y suma el total del proyecto", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Agregar cama", exact: true }).click();
  await expect(page.locator("#bed-select option")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Alcance de materiales", exact: true })
    .selectOption("project");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel este–oeste",
      exact: true,
    }),
  ).toHaveValue("38");
  await page
    .getByRole("button", { name: "Duplicar cama", exact: true })
    .click();
  await expect(page.locator("#bed-select option")).toHaveCount(3);
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel este–oeste",
      exact: true,
    }),
  ).toHaveValue("57");
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
    .getByRole("button", { name: "Panel fila 1 columna 2", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Panel fila 1 columna 2", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({ path: "/tmp/unirack-mobile.png", fullPage: true });
});

test("renderiza paneles en WebGL y permite quitarlos directamente en 3D", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect
    .poll(async () =>
      page.locator("canvas").evaluate((canvas) => {
        const source = canvas as HTMLCanvasElement;
        const flat = document.createElement("canvas");
        flat.width = source.width;
        flat.height = source.height;
        const ctx = flat.getContext("2d")!;
        ctx.drawImage(source, 0, 0);
        const data = ctx.getImageData(0, 0, flat.width, flat.height).data;
        let panelPixels = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] < 90 && data[i + 1] < 130 && data[i + 2] > data[i] * 1.2)
            panelPixels++;
        return panelPixels;
      }),
    )
    .toBeGreaterThan(1000);
  const rect = await page.locator("canvas").boundingBox();
  await page.mouse.click(
    rect!.x + rect!.width * 0.5,
    rect!.y + rect!.height * 0.5,
  );
  await expect(page.locator(".stat").first().locator("strong")).toContainText(
    "11",
  );
  await page.getByRole("button", { name: "Superior", exact: true }).click();
  await page.getByRole("button", { name: "Frontal", exact: true }).click();
  await page.getByRole("button", { name: "Lateral", exact: true }).click();
  await page
    .getByRole("button", { name: "Mostrar medidas", exact: true })
    .click();
  await expect(page.getByText("6.94 m", { exact: true })).toBeVisible();
});
