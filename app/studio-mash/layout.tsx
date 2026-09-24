import "./studio.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Administracion | MASH",
  robots: {
    index: false,
    follow: false
  }
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
