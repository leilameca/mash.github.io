"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function StudioNav({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return <nav className="studio-nav" aria-label="Administración">{items.map((item) => <Link key={item.href} href={item.href} aria-current={(item.href === "/studio-mash" ? pathname === item.href : pathname.startsWith(item.href)) ? "page" : undefined}>{item.label}</Link>)}</nav>;
}
