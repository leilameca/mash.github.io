import { NextRequest, NextResponse } from "next/server";
import { getAnnouncements } from "@/lib/editorial/queries";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");
  if (locale !== "es" && locale !== "en")
    return NextResponse.json([], { status: 400 });
  try {
    return NextResponse.json(await getAnnouncements(locale, Date.now()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json([], {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
