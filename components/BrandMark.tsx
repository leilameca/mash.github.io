import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n";

export function BrandMark({ locale }: { locale: Locale }) {
  return (
    <Link href={localizedPath(locale)} className="brand-mark" aria-label="MASH inicio">
      M<span>A</span>SH
    </Link>
  );
}
