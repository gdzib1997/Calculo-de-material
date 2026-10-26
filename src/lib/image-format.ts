export function rasterMime(
  bytes: Uint8Array,
): "image/jpeg" | "image/png" | "image/webp" | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n))
    return "image/png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return undefined;
}
export function validRasterDataUrl(value: string): boolean {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(value);
  if (!match) return false;
  try {
    const head = atob(value.slice(match[0].length, match[0].length + 32));
    return (
      rasterMime(Uint8Array.from(head, (c) => c.charCodeAt(0))) === match[1]
    );
  } catch {
    return false;
  }
}
