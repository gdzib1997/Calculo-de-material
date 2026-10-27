export interface PdfView {
  id: string;
  title: string;
  dataUrl: string;
}
export function capturePdfView(title = "Vista 3D"): PdfView {
  const canvas = document.querySelector("canvas");
  if (!canvas || !canvas.width || !canvas.height)
    throw new Error("Espera a que cargue la vista 3D.");
  const copy = document.createElement("canvas"),
    scale = Math.min(1, 1600 / Math.max(canvas.width, canvas.height));
  copy.width = Math.round(canvas.width * scale);
  copy.height = Math.round(canvas.height * scale);
  const ctx = copy.getContext("2d");
  if (!ctx) throw new Error("No se pudo capturar la vista.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, copy.width, copy.height);
  ctx.drawImage(canvas, 0, 0, copy.width, copy.height);
  return {
    id: crypto.randomUUID(),
    title,
    dataUrl: copy.toDataURL("image/png"),
  };
}
