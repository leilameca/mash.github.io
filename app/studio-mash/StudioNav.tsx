"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudioIcon, type StudioIconName } from "./StudioIcon";

const icons: Record<string, StudioIconName> = {
  "/studio-mash": "overview",
  "/studio-mash/productos": "products",
  "/studio-mash/colecciones": "collections",
  "/studio-mash/contenido": "content",
  "/studio-mash/proyectos": "projects",
  "/studio-mash/multimedia": "media"
};
export function StudioNav({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return <nav className="studio-nav" aria-label="Administración">{items.map((item) => <Link key={item.href} href={item.href} aria-current={(item.href === "/studio-mash" ? pathname === item.href : pathname.startsWith(item.href)) ? "page" : undefined}><StudioIcon name={icons[item.href] ?? "content"} /><span>{item.label}</span><span className="studio-nav__indicator" aria-hidden="true" /></Link>)}</nav>;
}
