"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudioIcon } from "./StudioIcon";
import type { StudioNavItem } from "@/lib/admin/navigation";
export function StudioNav({ items }: { items: StudioNavItem[] }) {
  const path = usePathname();
  const groups = [...new Set(items.map((i) => i.group ?? "Studio"))];
  return (
    <nav className="studio-nav" aria-label="Administración">
      {groups.map((group) => (
        <div className="studio-nav-group" key={group}>
          <p className="studio-nav-group__label">{group}</p>
          {items
            .filter((i) => (i.group ?? "Studio") === group)
            .map((item) => (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={
                  (
                    item.href === "/studio-mash"
                      ? path === item.href
                      : path.startsWith(item.href)
                  )
                    ? "page"
                    : undefined
                }
              >
                <StudioIcon name={item.icon ?? "content"} />
                <span className="studio-nav-label">{item.label}</span>
                {item.pending && (
                  <small
                    className="studio-nav-pending"
                    aria-label="Pendiente de implementación"
                  >
                    Próx.
                  </small>
                )}
              </Link>
            ))}
        </div>
      ))}
    </nav>
  );
}
