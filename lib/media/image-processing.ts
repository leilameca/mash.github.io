import sharp, { type Metadata } from "sharp";
import { createHash } from "node:crypto";
export const IMAGE_LIMITS = {
  bytes: 30 * 1024 * 1024,
  pixels: 40_000_000,
  edge: 16_000,
  seconds: 12,
} as const;
export const IMAGE_SIZES = {
  thumbnail: 256,
  catalog: 768,
  gallery: 1440,
  large: 2400,
} as const;
export type VariantRole = keyof typeof IMAGE_SIZES;
export type ProcessedFile = {
  bytes: Buffer;
  mime: string;
  extension: string;
  width: number;
  height: number;
  sha256: string;
};
export type ProcessedImage = {
  original: ProcessedFile;
  variants: Record<VariantRole, ProcessedFile>;
};
const sha = (data: Buffer) => createHash("sha256").update(data).digest("hex");
function sniff(bytes: Buffer) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return { mime: "image/jpeg", extension: "jpg", format: "jpeg" };
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { mime: "image/png", extension: "png", format: "png" };
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return { mime: "image/webp", extension: "webp", format: "webp" };
  if (
    bytes.toString("ascii", 4, 8) === "ftyp" &&
    /(avif|avis)/.test(bytes.toString("ascii", 8, 40))
  )
    return { mime: "image/avif", extension: "avif", format: "heif" };
  throw new Error(
    "El contenido no es una imagen JPG, PNG, WebP o AVIF válida.",
  );
}
/** No I/O, mutable originals, MIME trust or enlargement. Public outputs strip EXIF/XMP. */
export async function processImage(bytes: Buffer): Promise<ProcessedImage> {
  if (!bytes.length || bytes.length > IMAGE_LIMITS.bytes)
    throw new Error("El original debe pesar como máximo 30 MB.");
  const actual = sniff(bytes);
  const options = {
    limitInputPixels: IMAGE_LIMITS.pixels,
    limitInputChannels: 5,
    failOn: "warning" as const,
    sequentialRead: true,
    animated: false,
  };
  let metadata: Metadata;
  try {
    metadata = await sharp(bytes, options)
      .timeout({ seconds: IMAGE_LIMITS.seconds })
      .metadata();
  } catch {
    throw new Error(
      "La imagen está dañada o supera los límites de procesamiento.",
    );
  }
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > IMAGE_LIMITS.edge ||
    metadata.height > IMAGE_LIMITS.edge ||
    metadata.width * metadata.height > IMAGE_LIMITS.pixels ||
    (metadata.pages ?? 1) !== 1 ||
    ![actual.format, ...(actual.format === "heif" ? ["avif"] : [])].includes(
      metadata.format ?? "",
    )
  )
    throw new Error(
      "La imagen supera los límites de dimensiones o contiene varias páginas.",
    );
  const rotated = (metadata.orientation ?? 1) >= 5;
  const original = {
    bytes,
    mime: actual.mime,
    extension: actual.extension,
    width: rotated ? metadata.height : metadata.width,
    height: rotated ? metadata.width : metadata.height,
    sha256: sha(bytes),
  };
  const variants = {} as ProcessedImage["variants"];
  // Sequential outputs bound peak decoded-image memory as well as encoder work.
  for (const [role, size] of Object.entries(IMAGE_SIZES) as [
    VariantRole,
    number,
  ][]) {
    const { data, info } = await sharp(bytes, options)
      .rotate()
      .resize({
        width: size,
        height: size,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality:
          role === "thumbnail"
            ? 80
            : role === "catalog"
              ? 84
              : role === "gallery"
                ? 86
                : 88,
        effort: 4,
      })
      .timeout({ seconds: IMAGE_LIMITS.seconds })
      .toBuffer({ resolveWithObject: true });
    if (data.length > 8 * 1024 * 1024)
      throw new Error("La versión optimizada supera 8 MB. Reduce el original.");
    variants[role] = {
      bytes: data,
      mime: "image/webp",
      extension: "webp",
      width: info.width,
      height: info.height,
      sha256: sha(data),
    };
  }
  return { original, variants };
}
// A bounded per-process admission limit; a busy process rejects instead of queuing
// unbounded buffers. Distributed/global quotas remain a hosting configuration.
let active = 0;
export async function withImageSlot<T>(work: () => Promise<T>): Promise<T> {
  if (active >= 2)
    throw new Error(
      "El servidor está procesando otras fotografías. Reintenta en unos segundos.",
    );
  active++;
  try {
    return await work();
  } finally {
    active--;
  }
}
