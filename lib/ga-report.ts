import "server-only";
import { JWT } from "google-auth-library";
import { analyticsEventNames } from "./analytics";

export const reportingPeriods = [7, 30, 90] as const;
export type ReportingPeriod = (typeof reportingPeriods)[number];

export async function getCommercialEvents(days: ReportingPeriod = 30) {
  const property = process.env.MASH_GA_PROPERTY_ID;
  const credential = process.env.MASH_GA_SERVICE_ACCOUNT_JSON;
  if (!property || !/^\d+$/.test(property) || !credential) {
    return { status: "unconfigured" as const };
  }
  try {
    const { client_email: email, private_key: key } = JSON.parse(credential);
    if (typeof email !== "string" || typeof key !== "string")
      throw new Error("Invalid account");
    const client = new JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    const result = await client.request<{
      rows?: {
        dimensionValues?: { value: string }[];
        metricValues?: { value: string }[];
      }[];
    }>({
      url: `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
      method: "POST",
      timeout: 8000,
      retry: false,
      data: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "yesterday" }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: {
              values: analyticsEventNames,
            },
          },
        },
      },
    });
    const rows = (result.data.rows ?? []).flatMap((row) => {
      const event = row.dimensionValues?.[0]?.value;
      const count = Number(row.metricValues?.[0]?.value);
      return event && Number.isSafeInteger(count) && count >= 0
        ? [{ event, count }]
        : [];
    });
    return { status: "ready" as const, rows };
  } catch {
    return { status: "unavailable" as const };
  }
}
