import { redirect } from "next/navigation";
import { ContentWorkspace } from "./ContentWorkspace";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ formulario?: string }>;
}) {
  if ((await searchParams).formulario !== "1")
    redirect("/studio-mash/contenido/editor");
  return <ContentWorkspace />;
}
