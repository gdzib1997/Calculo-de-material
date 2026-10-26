import { rasterMime } from "./image-format";
export async function prepareRoofImage(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("La imagen supera 10 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Selecciona una foto JPEG, PNG o WebP.");
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (rasterMime(header) !== file.type)
    throw new Error(
      "El contenido no coincide con una foto JPEG, PNG o WebP válida.",
    );
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la foto.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    if (dataUrl.length > 2500000)
      throw new Error(
        "La foto sigue siendo demasiado grande. Prueba con una imagen más pequeña.",
      );
    return { dataUrl, aspect: canvas.width / canvas.height, name: file.name };
  } finally {
    bitmap.close();
  }
}
