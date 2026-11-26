import { createSupabaseServerClient } from "./server";
import { persistenceMessage } from "./errors";
import type { ContentKind, ImageRow, TranslationRow } from "./published";

export type ContentChange = {
  kind: ContentKind;
  id?: string;
  expected_version?: number;
  data: Record<string, unknown>;
  collection_ids?: string[];
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
  const saved = data as Array<{
    id: string;
    revision: number;
    kind?: ContentKind;
  }>;
  if (
    process.env.MASH_DEEPL_API_KEY?.trim() &&
    changes.some(
      (change) =>
        ["save", "publish"].includes(change.intent) &&
        (change.translations || change.images),
    )
  ) {
    try {
      const [{ after }, { runTranslation }] = await Promise.all([
        import("next/server"),
        import("@/lib/translation/run"),
      ]);
      after(async () => {
        // These rows already committed. Unfinished jobs remain in the center.
        for (const savedRow of saved) {
          const kind =
            savedRow.kind ??
            changes.find((item) => item.id === savedRow.id)?.kind ??
            (changes.length === 1 ? changes[0].kind : undefined);
          if (kind)
            await runTranslation(
              client,
              {
                kind,
                id: savedRow.id,
                version: savedRow.revision,
              },
              { queued: true },
            ).catch(() => {});
        }
      });
    } catch {
      // The editor's save result is independent of translation scheduling.
    }
  }
  return saved;
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
