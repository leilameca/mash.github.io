import { createSupabaseServerClient } from "./server";
import { persistenceMessage } from "./errors";
import type { ContentKind, ImageRow, TranslationRow } from "./published";

export type ContentChange = {
  kind: ContentKind;
  id?: string;
  expected_version?: number;
  data: Record<string, unknown>;
  translations?: TranslationRow[];
  images?: ImageRow[];
  intent: "save" | "publish" | "draft" | "hide" | "archive";
};
export async function authenticatedContentClient() {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error("Falta la configuración de Supabase.");
  return client;
}
export async function commitContent(
  client: Awaited<ReturnType<typeof authenticatedContentClient>>,
  changes: ContentChange[],
) {
  const { data, error } = await client.rpc("save_mash_content", {
    p_changes: changes,
  });
  if (error || !data) {
    const failure = new Error(persistenceMessage(error)) as Error & {
      rollbackConfirmed: boolean;
    };
    // A transport failure can arrive after COMMIT. Never delete uploaded files
    // unless PostgreSQL returned a SQLSTATE confirming the transaction failed.
    failure.rollbackConfirmed =
      !!error?.code && /^[0-9A-Z]{5}$/.test(error.code);
    throw failure;
  }
  return data as Array<{ id: string; revision: number }>;
}
export function canCleanupFailedSave(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "rollbackConfirmed" in error &&
    error.rollbackConfirmed === true
  );
}
export function expectedVersion(form: FormData): number | undefined {
  const value = form.get("revision");
  return value !== null && /^\d+$/.test(String(value))
    ? Number(value)
    : undefined;
}
export function saveIntent(form: FormData): "save" | "publish" {
  return form.get("intent") === "publish" ? "publish" : "save";
}
export async function contentTransaction(form: FormData) {
  const client = await authenticatedContentClient();
  let versions: Record<string, { id: string; revision: number }>;
  try {
    versions = JSON.parse(String(form.get("content_versions") ?? "{}"));
  } catch {
    throw new Error("Recarga el formulario antes de guardar.");
  }
  const changes: ContentChange[] = [];
  return {
    client,
    stageSite(
      key: string,
      value: Record<string, unknown>,
      translations: TranslationRow[],
    ) {
      changes.push({
        kind: "site",
        id: versions[key]?.id,
        expected_version: versions[key]?.revision,
        data: { key, value },
        translations,
        intent: saveIntent(form),
      });
    },
    commit: () => commitContent(client, changes),
  };
}
