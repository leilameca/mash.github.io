import type { ReactNode } from "react";

export type StudioIconName =
  | "overview"
  | "products"
  | "collections"
  | "content"
  | "projects"
  | "media"
  | "logout"
  | "external"
  | "settings"
  | "history"
  | "translate"
  | "analytics"
  | "news"
  | "sun"
  | "moon"
  | "chevron"
  | "plus"
  | "search"
  | "close"
  | "check"
  | "alert";

const paths: Record<StudioIconName, ReactNode> = {
  settings: (
    <>
      <path d="m9 3 1-1h4l1 3 3 1 3 2v4l-3 2-1 3-2 3h-4l-2-3-3-1-3-2v-4l3-2 1-3Z" />
      <circle cx="12" cy="11" r="3" />
    </>
  ),
  history: (
    <>
      <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2" />
    </>
  ),
  translate: (
    <>
      <path d="M3 5h12M9 2v3M5 8c2 5 5 7 9 8M13 5c-1 6-4 10-10 13M14 21l4-11 4 11M16 17h4" />
    </>
  ),
  analytics: (
    <>
      <path d="M3 3v18h18M7 15l4-5 4 3 5-7" />
    </>
  ),
  news: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h3v4H8zM14 11h2M14 15h2M8 18h8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1" />
    </>
  ),
  moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4L19 6" />,
  alert: (
    <>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v5M12 17v1" />
    </>
  ),
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  products: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
    </>
  ),
  collections: (
    <>
      <path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5" />
    </>
  ),
  content: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h5M8 18h3" />
    </>
  ),
  projects: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a25 25 0 0 0 18 0M10 13h4" />
    </>
  ),
  media: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="1.5" />
      <path d="m3 17 5-5 4 4 4-6 5 7" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M9 12h12m-4-4 4 4-4 4" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
    </>
  ),
};

export function StudioIcon({ name }: { name: StudioIconName }) {
  return (
    <svg
      className="studio-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
