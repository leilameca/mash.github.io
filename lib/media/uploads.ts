import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import {
  IMAGE_LIMITS,
  processImage,
  withImageSlot,
  type ProcessedFile,
} from "./image-processing";
import { MEDIA_FIELDS, type MediaAsset } from "./types";
export class MediaUploadError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
    this.name = "MediaUploadError";
  }
}
export type UploadOutcome =
  | { state: "ready"; asset: MediaAsset }
  | { state: "processing"; id: string; message: string };
async function readAsset(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("media_library")
    .select(MEDIA_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new MediaUploadError("No pudimos confirmar el estado de la carga.");
  return data as MediaAsset | null;
}
async function immutableWrite(
  server: SupabaseClient,
  bucket: string,
  path: string,
  file: ProcessedFile,
) {
  const { error } = await server.storage
    .from(bucket)
    .upload(path, file.bytes, {
      upsert: false,
      cacheControl: bucket === "mash-media" ? "31536000" : "0",
      contentType: file.mime,
    });
  if (!error) return;
  if (
    String(error.statusCode) === "409" ||
    /already exists|duplicate/i.test(error.message)
  ) {
    const { data, error: readError } = await server.storage
      .from(bucket)
      .download(path);
    if (
      !readError &&
      data &&
      data.size === file.bytes.length &&
      createHash("sha256")
        .update(Buffer.from(await data.arrayBuffer()))
        .digest("hex") === file.sha256
    )
      return;
    throw new MediaUploadError(
      "El archivo reservado tiene un conflicto de integridad. No se ha sobrescrito.",
      409,
    );
  }
  throw new MediaUploadError(
    "La carga quedó incompleta. Puedes reintentar el mismo archivo.",
  );
}
/** Server-side only; service credentials are used for Storage and finalization,
 * never exposed to the browser or used to save editorial content. */
export async function uploadManagedImage(
  client: SupabaseClient,
  server: SupabaseClient,
  file: File,
  folder: string,
  id: string = randomUUID(),
): Promise<UploadOutcome> {
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !["products", "collections", "projects", "site"].includes(folder)
  )
    throw new MediaUploadError("Identificador o carpeta no válidos.", 400);
  if (file.size > IMAGE_LIMITS.bytes)
    throw new MediaUploadError("El original no puede superar 30 MB.", 413);
  return withImageSlot(async () => {
    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const { data: existing, error: existingError } = await client
      .from("media_assets")
      .select("id,state,sha256")
      .eq("id", id)
      .maybeSingle();
    if (existingError)
      throw new MediaUploadError("No pudimos consultar el estado de la carga.");
    if (existing?.state === "ready") {
      if (existing.sha256 !== checksum)
        throw new MediaUploadError("Esta carga pertenece a otro archivo.", 409);
      const ready = await readAsset(client, id);
      if (ready) return { state: "ready", asset: ready };
    }
    let processed;
    try {
      processed = await processImage(bytes);
    } catch (error) {
      throw new MediaUploadError(
        error instanceof Error ? error.message : "Imagen no válida.",
        422,
      );
    }
    const lease = randomUUID();
    const { data: reservation, error: reserveError } = await client.rpc(
      "begin_mash_media",
      {
        p_id: id,
        p_lease: lease,
        p_meta: {
          name: file.name.slice(0, 255) || "Imagen",
          folder,
          mime: processed.original.mime,
          bytes: bytes.length,
          width: processed.original.width,
          height: processed.original.height,
          sha256: checksum,
        },
      },
    );
    if (reserveError || !reservation)
      throw new MediaUploadError(
        reserveError?.code === "22023"
          ? "No se puede reanudar esta carga con un archivo diferente."
          : "No pudimos reservar la carga. Intenta de nuevo.",
        reserveError?.code === "22023" ? 409 : 503,
      );
    if (reservation.state === "ready") {
      const asset = await readAsset(client, id);
      if (asset) return { state: "ready", asset };
    }
    if (reservation.state !== "reserved")
      return {
        state: "processing",
        id,
        message:
          "La carga sigue en proceso. Verifica su estado antes de reintentar.",
      };
    let completionStarted = false;
    try {
      const originalPath = `${folder}/${id}-original.${processed.original.extension}`;
      await immutableWrite(
        server,
        "mash-originals",
        originalPath,
        processed.original,
      );
      const variants = [];
      for (const [role, variant] of Object.entries(processed.variants)) {
        const path = `${folder}/${id}-${role}.webp`;
        await immutableWrite(server, "mash-media", path, variant);
        variants.push({
          role,
          path,
          width: variant.width,
          height: variant.height,
          bytes: variant.bytes.length,
          sha256: variant.sha256,
        });
      }
      completionStarted = true;
      const { error } = await server.rpc("complete_mash_media", {
        p_id: id,
        p_lease: lease,
        p_original_path: originalPath,
        p_variants: variants,
      });
      if (error) {
        if (!error.code || !/^([0-9A-Z]{5})$/.test(error.code)) {
          try {
            const asset = await readAsset(client, id);
            if (asset?.state === "ready") return { state: "ready", asset };
          } catch {}
          return {
            state: "processing",
            id,
            message:
              "Estamos verificando la confirmación de la carga. No vuelvas a crearla.",
          };
        }
        throw new MediaUploadError(
          "No se pudo finalizar la carga. Sus archivos se conservan para reintentar.",
        );
      }
      const asset = await readAsset(client, id);
      if (!asset || asset.state !== "ready")
        return {
          state: "processing",
          id,
          message: "La carga se está confirmando. Verifica su estado.",
        };
      return { state: "ready", asset };
    } catch (error) {
      // A transport failure after COMMIT must never trigger destructive cleanup.
      try {
        const asset = await readAsset(client, id);
        if (asset?.state === "ready") return { state: "ready", asset };
      } catch {
        if (completionStarted)
          return {
            state: "processing",
            id,
            message:
              "No pudimos confirmar el estado. Verifica esta misma carga.",
          };
      }
      // Partial objects remain under the reserved asset UUID. A retry verifies their
      // bytes before reuse; nothing is physically deleted, including historical media.
      const { error: failError } = await server.rpc("fail_mash_media", {
        p_id: id,
        p_lease: lease,
        p_code: "storage_or_manifest_failure",
      });
      if (failError)
        return {
          state: "processing",
          id,
          message:
            "La carga necesita verificación. Conservamos su identificador para reintentar.",
        };
      throw error instanceof MediaUploadError
        ? error
        : new MediaUploadError(
            "La carga quedó incompleta. Reintenta el mismo archivo.",
          );
    }
  });
}
