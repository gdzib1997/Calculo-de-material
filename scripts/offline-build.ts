import type { Plugin } from "vite";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
export function offlineBuild(): Plugin {
  let output: string;
  return {
    name: "unirack-offline-build",
    apply: "build",
    configResolved(config) {
      output = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      async function collect(folder: string): Promise<string[]> {
        const entries = await readdir(folder, { withFileTypes: true });
        const files = await Promise.all(
          entries.map((e) =>
            e.isDirectory()
              ? collect(path.join(folder, e.name))
              : [path.join(folder, e.name)],
          ),
        );
        return files.flat();
      }
      const hash = (data: Uint8Array | string) =>
          createHash("sha256").update(data).digest("hex"),
        template = await readFile(
          new URL("./offline-worker.js", import.meta.url),
          "utf8",
        ),
        files = await Promise.all(
          (await collect(output))
            .filter((f) => path.basename(f) !== "sw.js")
            .sort()
            .map(async (f) => ({
              path: path.relative(output, f).split(path.sep).join("/"),
              sha256: hash(await readFile(f)),
            })),
        ),
        revision = hash(JSON.stringify(files) + template).slice(0, 20);
      await writeFile(
        path.join(output, "sw.js"),
        template
          .replace("__PRECACHE__", JSON.stringify(files))
          .replace("__REVISION__", JSON.stringify(revision)),
      );
    },
  };
}
