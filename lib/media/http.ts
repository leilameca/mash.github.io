export class RequestLimitError extends Error {
  status = 413;
}
export async function boundedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new RequestLimitError("La solicitud supera el tamaño permitido.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new RequestLimitError("La solicitud supera el tamaño permitido.");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
