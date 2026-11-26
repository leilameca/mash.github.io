import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentKind, ContentSnapshot } from "@/lib/supabase/published";
import {
  fieldKey,
  hashText,
  packFields,
  protectText,
  selectFields,
  translationFields,
  type FieldRecord,
} from "./content";
import {
  configuredProvider,
  ProviderFailure,
  type TranslationProvider,
} from "./provider";

export type TranslationTarget = {
  kind: ContentKind;
  id: string;
  version: number;
};
export type TranslationMode = "translate" | "regenerate" | "review";
type Claim =
  | {
      status: "claimed";
      id: string;
      lease: string;
      attempts: number;
      snapshot: ContentSnapshot;
      previous: FieldRecord;
      terms: string[];
    }
  | { status: string; retryAt?: string };

export async function runTranslation(
  client: SupabaseClient,
  target: TranslationTarget,
  options: {
    mode?: TranslationMode;
    queued?: boolean;
    edits?: Record<string, string>;
    provider?: TranslationProvider | null;
  } = {},
) {
  const mode = options.mode ?? "translate";
  const provider =
    options.provider === undefined ? configuredProvider() : options.provider;
  if (mode !== "review" && !provider) return { status: "unavailable" };
  const reservation = await client.rpc("claim_translation", {
    p_kind: target.kind,
    p_id: target.id,
    p_version: target.version,
    p_mode: mode,
    p_queue_only: options.queued ?? false,
  });
  if (reservation.error || !reservation.data)
    throw new Error("No pudimos reservar la traducción.");
  const claim = reservation.data as Claim;
  if (claim.status !== "claimed" || !("snapshot" in claim)) return claim;
  const fields = translationFields(target.kind, claim.snapshot);
  const records: FieldRecord = {};
  const changes: { path: string[]; text: string }[] = [];
  let billed: number | null = null;
  let code: string | null = null;
  let retry = 15;
  try {
    if (mode === "review") {
      for (const field of fields) {
        const key = fieldKey(field.path);
        const text = options.edits?.[key]?.trim() ?? field.en;
        if (!text || text.length > Math.max(600, field.es.length * 4))
          throw new ProviderFailure("review_incomplete");
        records[key] = { hash: hashText(field.es), text, manual: true };
        if (text !== field.en) changes.push({ path: field.path, text });
      }
      if (!fields.length) throw new ProviderFailure("review_incomplete");
    } else {
      const selected = selectFields(
        fields,
        claim.previous,
        mode === "regenerate",
      );
      const terms = [
        ...claim.terms,
        ...fields.filter((field) => field.copy).map((field) => field.es),
      ]
        .filter((term) => term.length <= 160)
        .slice(0, 120);
      const inputs = selected.filter((field) => !field.copy);
      const protectedInputs = inputs.map((field) =>
        protectText(field.es, terms),
      );
      // Use two small requests for the largest existing CMS block. Each request
      // stays under DeepL's item limit and no other work runs inside this job.
      const translated = new Map<string, string>();
      let countKnown = true;
      let count = 0;
      for (let i = 0; i < inputs.length; i += 40) {
        const batch = protectedInputs.slice(i, i + 40);
        const response = await provider!.translate(
          batch.map((item) => item.marked),
        );
        if (response.billed === null) countKnown = false;
        else count += response.billed;
        billed = countKnown ? count : null;
        for (let offset = 0; offset < batch.length; offset++) {
          translated.set(
            fieldKey(inputs[i + offset].path),
            batch[offset].restore(response.translations[offset]),
          );
        }
      }
      for (const field of fields) {
        const key = fieldKey(field.path);
        const previous = claim.previous[key];
        const replacement =
          translated.get(key) ??
          (field.copy && selected.includes(field) ? field.es : undefined);
        if (replacement !== undefined) {
          records[key] = { hash: hashText(field.es), text: replacement };
          if (replacement !== field.en)
            changes.push({ path: field.path, text: replacement });
        } else if (previous && previous.text === field.en) {
          records[key] = previous;
        } else if (field.en) {
          records[key] = {
            hash: hashText(field.es),
            text: field.en,
            manual: true,
          };
        }
      }
    }
  } catch (error) {
    code = error instanceof ProviderFailure ? error.code : "invalid_response";
    retry = Math.max(
      error instanceof ProviderFailure ? error.delay : 15,
      Math.min(300, 2 ** claim.attempts),
    );
  }
  const packed = packFields(changes, claim.snapshot);
  const result = await client.rpc("finish_translation", {
    p_id: claim.id,
    p_lease: claim.lease,
    p_fields: records,
    p_text: packed.text,
    p_alts: packed.alts,
    p_provider: mode === "review" ? null : provider!.name,
    p_billed: billed,
    p_error: code,
    p_retry: retry,
  });
  if (result.error || !result.data)
    throw new Error(
      "No pudimos confirmar el resultado. Consulta el estado antes de reintentar.",
    );
  return { status: String(result.data), code };
}
