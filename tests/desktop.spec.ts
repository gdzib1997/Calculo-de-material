import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { cp, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import type { Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
let server: Server,
  base: string,
  folder: string,
  current: string,
  original: string,
  next: string,
  broken: string;
const prefix = "/Calculo-de-material/";
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
test.beforeAll(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "unirack-desktop-"));
  original = path.join(folder, "a");
  next = path.join(folder, "b");
  broken = path.join(folder, "broken");
  await cp("dist", original, { recursive: true });
  await cp(original, next, { recursive: true });
  await cp(original, broken, { recursive: true });
  const html = await readFile(path.join(original, "index.html"), "utf8");
  let sw = await readFile(path.join(next, "sw.js"), "utf8");
  const entries = JSON.parse(/const FILES = (\[[\s\S]*?\]);/.exec(sw)![1]) as {
    path: string;
    sha256: string;
  }[];
  const renamed = new Map(
    entries
      .filter((f) => f.path.endsWith(".js"))
      .map((f) => [f.path, f.path.replace(/\.js$/, "-update.js")]),
  );
  for (const [before, after] of renamed) {
    let code = await readFile(path.join(original, before), "utf8");
    for (const [oldName, newName] of renamed)
      code = code.replaceAll(path.basename(oldName), path.basename(newName));
    await writeFile(path.join(next, after), code);
    await rm(path.join(next, before));
  }
  let changed = html.replace("<title>", "<title>Actualización PC · ");
  for (const [before, after] of renamed)
    changed = changed.replaceAll(prefix + before, prefix + after);
  await writeFile(path.join(next, "index.html"), changed);
  for (const entry of entries) {
    entry.path = renamed.get(entry.path) ?? entry.path;
    entry.sha256 = createHash("sha256")
      .update(await readFile(path.join(next, entry.path)))
      .digest("hex");
  }
  sw = sw
    .replace(
      /const FILES = \[[\s\S]*?\];/,
      "const FILES = " + JSON.stringify(entries) + ";",
    )
    .replace(/const REVISION = "[^"]+";/, 'const REVISION = "desktop-test-b";');
  await writeFile(path.join(next, "sw.js"), sw);
  await writeFile(path.join(broken, "index.html"), changed); // Los bytes no coinciden con el manifiesto.
  await writeFile(
    path.join(broken, "sw.js"),
    (await readFile(path.join(original, "sw.js"), "utf8")).replace(
      /const REVISION = "[^"]+";/,
      'const REVISION = "desktop-test-broken";',
    ),
  );
  current = original;
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url!, "http://test");
      if (!url.pathname.startsWith(prefix)) {
        res.writeHead(404).end();
        return;
      }
      const rel =
          decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html",
        file = path.resolve(current, rel);
      if (!file.startsWith(current + path.sep)) {
        res.writeHead(404).end();
        return;
      }
      const bytes = await readFile(file);
      res
        .writeHead(200, {
          "Content-Type":
            mime[path.extname(file)] || "application/octet-stream",
          "Cache-Control": "no-store",
        })
        .end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}${prefix}`;
});
test.afterAll(async () => {
  server?.closeAllConnections();
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  if (folder) await rm(folder, { recursive: true, force: true });
});
async function ready(page: Page) {
  await expect(
    page.locator('.desktop-install-bar [role="status"]'),
  ).toContainText("Listo para usar sin conexión", { timeout: 45000 });
}

test("PC: instala todos los recursos y abre, edita y exporta sin internet", async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  current = original;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await ready(page);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
  const manifest = await (
    await page.request.get(base + "manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("./");
  for (const icon of manifest.icons) {
    const response = await page.request.get(base + icon.src);
    expect(response.ok()).toBe(true);
    expect((await response.body()).readUInt32BE(16)).toBe(
      Number(icon.sizes.split("x")[0]),
    );
  }
  await page
    .getByRole("textbox", { name: "Nombre del proyecto", exact: true })
    .fill("Mi proyecto de PC");
  await page.getByRole("button", { name: "Rieles", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nombre del nuevo riel", exact: true })
    .fill("Riel offline");
  await page
    .getByRole("button", { name: "Añadir riel a la cama", exact: true })
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "Riel seleccionado", exact: true })
      .locator("option:checked"),
  ).toHaveText("Riel offline");
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.locator('.desktop-install-bar [role="status"]'),
  ).toContainText("Sin conexión", { timeout: 30000 });
  await expect(
    page.getByRole("textbox", { name: "Nombre del proyecto", exact: true }),
  ).toHaveValue("Mi proyecto de PC");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("spinbutton", {
      name: "Cantidad Riel (total)",
      exact: true,
    }),
  ).toHaveValue("22");
  for (const [label, ext] of [
    ["Documento PDF", "pdf"],
    ["Documento Word", "docx"],
    ["Libro de Excel", "xlsx"],
  ]) {
    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: new RegExp(label) }).click();
    if (ext === "pdf")
      await page
        .getByRole("button", { name: "Descargar PDF", exact: true })
        .click();
    const download = await downloading,
      file = test.info().outputPath("offline." + ext);
    await download.saveAs(file);
    const bytes = await readFile(file);
    expect(bytes.length).toBeGreaterThan(2000);
    if (ext === "pdf") expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    else expect(bytes.subarray(0, 2).toString()).toBe("PK");
    if (ext === "xlsx") {
      const book = new ExcelJS.Workbook();
      await book.xlsx.readFile(file);
      expect(book.getWorksheet("Materiales")!.getCell("B6").value).toBe(22);
    }
  }
  await page.close();
  const opened = await context.newPage();
  opened.on("pageerror", (e) => errors.push(e.message));
  await opened.goto(base);
  await expect(
    opened.getByRole("textbox", { name: "Nombre del proyecto", exact: true }),
  ).toHaveValue("Mi proyecto de PC");
  await expect(opened.locator("canvas")).toBeVisible({ timeout: 15000 });
  expect(errors).toEqual([]);
});

test("PC: actualiza sólo por decisión del usuario y conserva el proyecto y otras ventanas", async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  current = original;
  await page.goto(base);
  await ready(page);
  const second = await context.newPage();
  second.on("pageerror", (e) => errors.push(e.message));
  await second.goto(base);
  await ready(second);
  await page
    .getByRole("textbox", { name: "Nombre del proyecto", exact: true })
    .fill("Proyecto conservado");
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  const oldCaches = await page.evaluate(() => caches.keys());
  current = next;
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg!.update();
  });
  const update = page.getByRole("button", {
    name: "Actualizar aplicación",
    exact: true,
  });
  await expect(update).toBeVisible({ timeout: 45000 });
  expect(await page.title()).not.toContain("Actualización PC");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  await page.getByRole("button", { name: /Documento PDF/ }).click();
  await expect(update).toBeDisabled();
  await page.getByRole("button", { name: "Volver al 3D", exact: true }).click();
  await expect(update).toBeEnabled();
  await update.click();
  await expect(page).toHaveTitle(/Actualización PC/, { timeout: 30000 });
  await ready(page);
  await expect(
    page.getByRole("textbox", { name: "Nombre del proyecto", exact: true }),
  ).toHaveValue("Proyecto conservado");
  expect(await second.title()).not.toContain("Actualización PC");
  for (const name of oldCaches)
    expect(await page.evaluate(() => caches.keys())).toContain(name);
  await second.close();
  await page.evaluate(async () => {
    const ch = new MessageChannel();
    const answered = new Promise<void>((r) => (ch.port1.onmessage = () => r()));
    navigator.serviceWorker.controller!.postMessage(
      {
        type: "OFFLINE_STATUS",
        mainAsset: document.querySelector<HTMLScriptElement>(
          'script[type="module"][src]',
        )!.src,
      },
      [ch.port2],
    );
    await answered;
  });
  await expect.poll(() => page.evaluate(() => caches.keys())).toHaveLength(1);
  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle(/Actualización PC/);
  expect(errors).toEqual([]);
  await expect(
    page.getByRole("textbox", { name: "Nombre del proyecto", exact: true }),
  ).toHaveValue("Proyecto conservado");
});

test("PC: una actualización incompleta no reemplaza la copia offline válida", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  current = original;
  await page.goto(base);
  await ready(page);
  await page
    .getByRole("textbox", { name: "Nombre del proyecto", exact: true })
    .fill("Conservar aunque falle la actualización");
  await expect(
    page.getByText("Guardado localmente", { exact: true }),
  ).toBeVisible();
  current = broken;
  const state = await page.evaluate(async () => {
    const reg = (await navigator.serviceWorker.getRegistration())!;
    const ended = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("No terminó el intento de actualización")),
        20000,
      );
      reg.addEventListener(
        "updatefound",
        () => {
          const worker = reg.installing!;
          worker.addEventListener("statechange", () => {
            if (worker.state === "redundant" || worker.state === "installed") {
              clearTimeout(timer);
              resolve(worker.state);
            }
          });
        },
        { once: true },
      );
    });
    await reg.update();
    return ended;
  });
  expect(state).toBe("redundant");
  await expect(
    page.getByRole("button", { name: "Actualizar aplicación", exact: true }),
  ).toHaveCount(0);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Nombre del proyecto", exact: true }),
  ).toHaveValue("Conservar aunque falle la actualización");
  await expect(
    page.locator('.desktop-install-bar [role="status"]'),
  ).toContainText("Sin conexión", { timeout: 30000 });
  expect(await page.title()).not.toContain("Actualización PC");
});
