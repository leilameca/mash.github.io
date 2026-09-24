import { site } from "@/lib/content";

export function QuoteLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <a href={site.whatsapp} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
