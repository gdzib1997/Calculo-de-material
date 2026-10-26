import { createProject, validateProject } from "./model";
import type { Project } from "./model";
const KEY = "unirack-studio-project-v1";
export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? validateProject(JSON.parse(raw)) : createProject();
  } catch {
    return createProject();
  }
}
export function saveProject(project: Project) {
  localStorage.setItem(KEY, JSON.stringify(project));
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function safeName(name: string) {
  return (
    name
      .replace(/[^\p{L}\p{N} _-]/gu, "")
      .trim()
      .slice(0, 80) || "proyecto-solar"
  );
}
