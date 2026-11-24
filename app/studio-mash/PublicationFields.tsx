"use client";
import { SubmissionIntent } from "./FormSafety";
import { createContext, useContext, type ReactNode } from "react";
type Versions = Record<string, { id: string; revision: number }>;
const VersionContext = createContext<Versions>({});
export function PublicationProvider({
  versions,
  children,
}: {
  versions: Versions;
  children: ReactNode;
}) {
  return (
    <VersionContext.Provider value={versions}>
      {children}
    </VersionContext.Provider>
  );
}
export function PublicationFields() {
  const versions = useContext(VersionContext);
  return (
    <>
      <SubmissionIntent />
      <input
        type="hidden"
        name="content_versions"
        value={JSON.stringify(versions)}
      />
    </>
  );
}
export function PublishButton({ disabled }: { disabled?: boolean }) {
  return (
    <button
      className="admin-button"
      type="submit"
      name="intent"
      value="publish"
      disabled={disabled}
    >
      Publicar cambios
    </button>
  );
}
