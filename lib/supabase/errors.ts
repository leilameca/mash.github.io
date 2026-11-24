export type ContentErrorCode =
  "configuration" | "connection" | "missing" | "invalid" | "conflict";
export class ContentError extends Error {
  constructor(
    public readonly code: ContentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ContentError";
  }
}
export function persistenceMessage(error: { code?: string } | null) {
  if (error?.code === "40001")
    return "Otra persona o pestaña cambió este contenido. Recarga y revisa los cambios antes de guardar.";
  if (error?.code === "23505")
    return "Ese slug o identificador ya está en uso.";
  if (error?.code === "42501")
    return "Tu sesión no tiene permiso para esta operación.";
  if (error?.code === "22023" || error?.code === "23514")
    return "El contenido no cumple los requisitos para guardar o publicar. Revisa textos, colección e imágenes.";
  return "No pudimos confirmar el guardado. Recarga el contenido antes de reintentar.";
}
