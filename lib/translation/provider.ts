import "server-only";
import { z } from "zod";

export interface TranslationProvider {
  name: string;
  translate(
    text: string[],
  ): Promise<{ translations: string[]; billed: number | null }>;
}
export class ProviderFailure extends Error {
  constructor(
    public code: string,
    public delay = 15,
  ) {
    super(code);
  }
}
const responseSchema = z.object({
  translations: z.array(
    z.object({
      text: z.string().min(1),
      billed_characters: z.number().int().nonnegative().optional(),
    }),
  ),
});

export function deepL(key: string, transport = fetch): TranslationProvider {
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  return {
    name: "DeepL",
    async translate(text) {
      const body = JSON.stringify({
        text,
        source_lang: "ES",
        target_lang: "EN-US",
        tag_handling: "xml",
        ignore_tags: ["keep"],
        show_billed_characters: true,
        context:
          "MASH is a premium outdoor furniture brand in the Dominican Republic. Use natural English and a refined, understated tone.",
      });
      if (text.length > 50 || Buffer.byteLength(body) > 96 * 1024)
        throw new ProviderFailure("size_limit");
      let response: Response;
      try {
        response = await transport(`https://${host}/v2/translate`, {
          method: "POST",
          redirect: "error",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Authorization: `DeepL-Auth-Key ${key}`,
          },
          body,
          signal: AbortSignal.timeout(12000),
        });
      } catch {
        throw new ProviderFailure("unreachable");
      }
      if (!response.ok) {
        const retry = response.headers.get("Retry-After");
        const seconds =
          retry && /^\d+$/.test(retry)
            ? Number(retry)
            : retry
              ? (Date.parse(retry) - Date.now()) / 1000
              : 0;
        throw new ProviderFailure(
          response.status === 429
            ? "rate_limit"
            : response.status === 456
              ? "quota"
              : response.status === 403
                ? "credentials"
                : "provider_error",
          Math.max(response.status === 429 ? 30 : 15, Math.ceil(seconds || 0)),
        );
      }
      const parsed = responseSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!parsed.success || parsed.data.translations.length !== text.length)
        throw new ProviderFailure("invalid_response");
      const all = parsed.data.translations;
      return {
        translations: all.map((item) => item.text),
        billed: all.every((item) => item.billed_characters !== undefined)
          ? all.reduce((sum, item) => sum + item.billed_characters!, 0)
          : null,
      };
    },
  };
}
export function configuredProvider() {
  const key = process.env.MASH_DEEPL_API_KEY?.trim();
  return key ? deepL(key) : null;
}
