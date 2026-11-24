export const translationStates = {
  pending: "Pendiente",
  queued: "En cola",
  processing: "En proceso",
  translated: "Traducción automática",
  reviewed: "Revisado",
  stale: "Desactualizado",
  error: "Error",
} as const;

export const translationErrors: Record<string, string> = {
  review_incomplete:
    "Completa todos los campos traducibles antes de marcar la revisión.",
  rate_limit:
    "El proveedor limitó las solicitudes. Reintenta después de la pausa.",
  quota: "La cuota del proveedor se agotó.",
  credentials: "El proveedor rechazó la configuración.",
  unreachable: "El proveedor no respondió a tiempo.",
  size_limit: "El bloque supera el tamaño de traducción permitido.",
  invalid_response: "La respuesta del proveedor no se pudo verificar.",
  provider_error: "El proveedor devolvió un error.",
};
