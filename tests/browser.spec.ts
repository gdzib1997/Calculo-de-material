import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { createProject } from "../src/lib/model";

test("interfaz sin precios ni reglas y biblioteca de paneles persistente", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
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
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
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
    if (ext === ".pdf")
      await page
        .getByRole("button", { name: "Descargar PDF", exact: true })
        .click();
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
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
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

test("elige cama y rieles de ambos ejes sin automatismos por filas", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Tipo de cama", exact: true })
    .selectOption("single");
  await expect(
    page.getByRole("spinbutton", { name: "Filas", exact: true }),
  ).toHaveValue("1");
  await page.getByRole("button", { name: "Estructura", exact: true }).click();
  const ew = page.getByRole("combobox", {
      name: "Rieles este–oeste",
      exact: true,
    }),
    ns = page.getByRole("combobox", { name: "Rieles norte–sur", exact: true });
  await expect(ns).toHaveValue("include");
  await ew.selectOption("exclude");
  await ns.selectOption("exclude");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("0");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Abrazadera final · End Clamp",
      exact: true,
    }),
  ).toHaveValue("0");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Pata · perfil vertical",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Distribución", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tipo de cama", exact: true })
    .selectOption("double");
  await page.getByRole("button", { name: "Estructura", exact: true }).click();
  await expect(ew).toHaveValue("exclude");
  await expect(ns).toHaveValue("exclude");
  await ew.selectOption("include");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Abrazadera final · End Clamp",
      exact: true,
    }),
  ).toHaveValue("8");
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Estructura", exact: true }).click();
  await expect(ew).toHaveValue("include");
  await expect(ns).toHaveValue("exclude");
});

test("cuadrícula completa con patas individuales añadidas y retiradas persistentes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Patas y bases", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Distribución de patas", exact: true })
    .selectOption("grid");
  const legs = page.getByRole("combobox", {
    name: "Pata seleccionada",
    exact: true,
  });
  await expect(legs.locator("option")).toHaveCount(8);
  await page
    .getByRole("spinbutton", { name: "Patas en E–O", exact: true })
    .fill("3");
  await page
    .getByRole("spinbutton", { name: "Patas en N–S", exact: true })
    .fill("3");
  await expect(legs.locator("option")).toHaveCount(9);
  await page
    .getByRole("button", { name: "Quitar pata seleccionada", exact: true })
    .click();
  await expect(legs.locator("option")).toHaveCount(8);
  await page
    .getByRole("button", { name: "Añadir pata al riel", exact: true })
    .click();
  await expect(legs.locator("option")).toHaveCount(9);
  await expect(legs).toHaveValue(/^extra:/);
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad T-Bolt", exact: true }),
  ).toHaveValue("27");
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Bloque de concreto sólido",
      exact: true,
    }),
  ).toHaveValue("9");
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Patas y bases", exact: true })
    .click();
  await expect(legs.locator("option")).toHaveCount(9);
  await page
    .getByRole("button", { name: "Reponer patas retiradas", exact: true })
    .click();
  await expect(legs.locator("option")).toHaveCount(10);
});

test("PDF limpio con ubicación, logo y sólo las vistas elegidas", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
  await page
    .getByRole("button", { name: "Guardar vista para PDF", exact: true })
    .click();
  await page.getByRole("button", { name: "Superior", exact: true }).click();
  await page
    .getByRole("button", { name: "Mostrar sólo estructura", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mostrar sólo estructura", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Guardar vista para PDF", exact: true })
    .click();
  await page.getByRole("button", { name: "Exportar", exact: false }).click();
  await page.getByRole("button", { name: /Documento PDF/ }).click();
  await page
    .getByRole("textbox", { name: "Proyecto en PDF", exact: true })
    .fill("Instalacion Soleon");
  await page
    .getByRole("textbox", { name: "Cliente en PDF", exact: true })
    .fill("Cliente prueba");
  await page
    .getByRole("textbox", { name: "Ubicación en PDF", exact: true })
    .fill("Merida, Yucatan");
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 60;
    const x = c.getContext("2d")!;
    x.fillStyle = "#ef771e";
    x.fillRect(0, 0, 240, 60);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Logo de Soleon", { exact: true }).setInputFiles({
    name: "logo-prueba.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await expect(
    page.getByAltText("Logo de Soleon para PDF", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Incluir Vista 1", exact: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Incluir Vista actual", exact: true })
    .uncheck();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar PDF", exact: true })
    .click();
  await (await download).saveAs("/tmp/unirack-v04-clean.pdf");
  const text = execFileSync("pdftotext", ["/tmp/unirack-v04-clean.pdf", "-"], {
    encoding: "utf8",
  });
  expect(text).toContain("Instalacion Soleon");
  expect(text).toContain("Cliente prueba");
  expect(text).toContain("Merida, Yucatan");
  expect(text).toContain("Vista 2");
  expect(text).not.toMatch(
    /Vista 1|Vista actual|Origen|Camas del proyecto|Patas|Contravientos|Techo de referencia|perfil vertical|UNIRACK|Reglas/,
  );
  expect(text).toContain("Riel (total)");
  await page.getByRole("button", { name: "Exportar", exact: false }).click();
  await page.getByRole("button", { name: /Documento PDF/ }).click();
  await page
    .getByRole("checkbox", { name: "Incluir Vista 1", exact: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Incluir Vista 2", exact: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Incluir Vista actual", exact: true })
    .uncheck();
  const materialsOnly = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar PDF", exact: true })
    .click();
  await (await materialsOnly).saveAs("/tmp/unirack-v04-materials.pdf");
  expect(
    execFileSync("pdfinfo", ["/tmp/unirack-v04-materials.pdf"], {
      encoding: "utf8",
    }),
  ).toMatch(/Pages:\s+1/);
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Exportar", exact: false }).click();
  await page.getByRole("button", { name: /Documento PDF/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Ubicación en PDF", exact: true }),
  ).toHaveValue("Merida, Yucatan");
  await expect(
    page.getByAltText("Logo de Soleon para PDF", { exact: true }),
  ).toBeVisible();
});

test("las cotas sobreviven cambios repetidos de cuadrícula y selección en 3D", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
  await page
    .getByRole("button", { name: "Mostrar medidas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Patas y bases", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Distribución de patas", exact: true })
    .selectOption("grid");
  for (const count of [2, 4, 3]) {
    await page
      .getByRole("spinbutton", { name: "Patas en E–O", exact: true })
      .fill(String(count));
    await page
      .getByRole("button", { name: "Añadir pata al riel", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Quitar pata seleccionada", exact: true })
      .click();
    await page.getByRole("button", { name: /^Materiales/ }).click();
    await page
      .getByRole("button", { name: "Patas y bases", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Superior", exact: true }).click();
  await page.getByRole("button", { name: "Frontal", exact: true }).click();
  await expect(
    page
      .getByRole("combobox", { name: "Pata seleccionada", exact: true })
      .locator("option"),
  ).toHaveCount(6);
  await page
    .locator(".model-card")
    .screenshot({ path: "/tmp/unirack-v04-dimensions.png" });
  expect(errors).toEqual([]);
});

test("añade y elimina riel E–O con patas y contravientos, y recupera el conjunto", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Rieles", exact: true }).click();
  await page
    .getByRole("button", { name: "Eliminar riel seleccionado", exact: true })
    .click();
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("18");
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad L-Foot", exact: true }),
  ).toHaveValue("18");
  await page.getByRole("button", { name: "Rieles", exact: true }).click();
  await page
    .getByRole("button", { name: "Reponer riel seleccionado", exact: true })
    .click();
  const create = page.locator(".rail-editor form").last();
  await create
    .getByRole("button", { name: "Añadir riel a la cama", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Riel seleccionado", exact: true }),
  ).toHaveValue(/^manual-rail:/);
  await page
    .getByRole("button", { name: "Eliminar riel seleccionado", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nombre del nuevo riel", exact: true })
    .fill("Riel E-O extra");
  await create
    .getByRole("spinbutton", { name: "Inicio E–O del riel", exact: true })
    .fill("-3");
  await create
    .getByRole("spinbutton", { name: "Final E–O del riel", exact: true })
    .fill("3");
  await create
    .getByRole("spinbutton", { name: "Posición N–S del riel", exact: true })
    .fill("1");
  await create
    .getByRole("button", { name: "Añadir riel a la cama", exact: true })
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "Riel seleccionado", exact: true })
      .locator("option:checked"),
  ).toHaveText("Riel E-O extra");
  const id = await page
    .getByRole("combobox", { name: "Riel seleccionado", exact: true })
    .inputValue();
  expect(id).toMatch(/^manual-rail:/);
  await page
    .getByRole("button", { name: "Patas y bases", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Riel para añadir pata", exact: true })
    .selectOption(id);
  await page
    .getByRole("button", { name: "Añadir pata al riel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Añadir pata al riel", exact: true })
    .click();
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  const ids = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("unirack-studio-project-v1")!,
    ).beds[0].extraSupports.map((s: { id: string }) => s.id),
  );
  await page
    .getByRole("button", { name: "Contravientos", exact: true })
    .click();
  await page
    .getByRole("combobox", {
      name: "Pata de origen del contraviento",
      exact: true,
    })
    .selectOption(ids[0]);
  await page
    .getByRole("combobox", {
      name: "Pata de destino del contraviento",
      exact: true,
    })
    .selectOption(ids[1]);
  await page
    .getByRole("button", { name: "Agregar contraviento", exact: true })
    .click();
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad T-Bolt", exact: true }),
  ).toHaveValue("82");
  await page.getByRole("button", { name: "Rieles", exact: true }).click();
  await page
    .getByRole("button", { name: "Eliminar riel seleccionado", exact: true })
    .click();
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("20");
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad T-Bolt", exact: true }),
  ).toHaveValue("72");
  await page.getByRole("button", { name: "Rieles", exact: true }).click();
  await page
    .getByRole("button", { name: "Reponer riel seleccionado", exact: true })
    .click();
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad T-Bolt", exact: true }),
  ).toHaveValue("82");
  await page
    .getByRole("button", { name: "Contravientos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Eliminar contraviento", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Patas y bases", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Pata seleccionada", exact: true })
    .selectOption(ids[0]);
  await page
    .getByRole("button", { name: "Quitar pata seleccionada", exact: true })
    .click();
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Cantidad T-Bolt", exact: true }),
  ).toHaveValue("75");
  expect(errors).toEqual([]);
});

test("añade, edita y retira N–S y exporta únicamente sus cortes activos", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Rieles", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Sentido del nuevo riel", exact: true })
    .selectOption("z");
  const create = page.locator(".rail-editor form").last();
  await page
    .getByRole("textbox", { name: "Nombre del nuevo riel", exact: true })
    .fill("N-S manual");
  await create
    .getByRole("spinbutton", { name: "Inicio N–S del riel", exact: true })
    .fill("-2");
  await create
    .getByRole("spinbutton", { name: "Final N–S del riel", exact: true })
    .fill("2");
  await create
    .getByRole("spinbutton", { name: "Posición E–O del riel", exact: true })
    .fill("0");
  await create
    .getByRole("button", { name: "Añadir riel a la cama", exact: true })
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "Riel seleccionado", exact: true })
      .locator("option:checked"),
  ).toHaveText("N-S manual");
  const id = await page
    .getByRole("combobox", { name: "Riel seleccionado", exact: true })
    .inputValue();
  const edit = page.locator(".rail-editor form").first();
  await edit
    .getByRole("spinbutton", { name: "Inicio N–S del riel", exact: true })
    .fill("-5");
  await edit
    .getByRole("button", { name: "Aplicar medidas del riel", exact: true })
    .click();
  await page.getByRole("button", { name: /^Materiales/ }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("22");
  await page.getByRole("button", { name: "Rieles", exact: true }).click();
  await page
    .getByRole("button", { name: "Eliminar riel seleccionado", exact: true })
    .click();
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: /Libro de Excel/ }).click();
  const dl = await pending;
  const file = "/tmp/unirack-v05-rails.xlsx";
  await dl.saveAs(file);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  expect(workbook.getWorksheet("Materiales")!.getCell("B6").value).toBe(20);
  expect(workbook.getWorksheet("Perfiles")!.getColumn(2).values).not.toContain(
    id,
  );
  await page
    .getByRole("button", { name: "Reponer riel seleccionado", exact: true })
    .click();
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Rieles", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Riel seleccionado", exact: true })
    .selectOption(id);
  await expect(
    page
      .locator(".rail-editor form")
      .first()
      .getByRole("spinbutton", { name: "Inicio N–S del riel", exact: true }),
  ).toHaveValue("-5");
});
