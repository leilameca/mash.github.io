"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { StudioIcon } from "./StudioIcon";
type Theme = "system" | "light" | "dark";
const Context = createContext({
  theme: "system" as Theme,
  resolved: "light",
  setTheme: (_theme: Theme) => {},
});
export function StudioTheme({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolved, setResolved] = useState("light");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mash-studio-theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      setResolved(next);
      document
        .getElementById("mash-studio-root")
        ?.setAttribute("data-theme", next);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const choose = (value: Theme) => {
    setTheme(value);
    try {
      localStorage.setItem("mash-studio-theme", value);
    } catch {}
  };
  return (
    <Context.Provider value={{ theme, resolved, setTheme: choose }}>
      <div
        id="mash-studio-root"
        className="studio-root"
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mash-studio-theme');document.getElementById('mash-studio-root').dataset.theme=(t==='dark'||t==='light')?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){}`,
          }}
        />
        {children}
      </div>
    </Context.Provider>
  );
}
export function ThemeToggle() {
  const { resolved, setTheme } = useContext(Context);
  return (
    <button
      className="studio-icon-button"
      type="button"
      aria-label={
        resolved === "dark" ? "Activar modo claro" : "Activar modo oscuro"
      }
      title="Cambiar tema"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
    >
      <StudioIcon name={resolved === "dark" ? "sun" : "moon"} />
    </button>
  );
}
export function ThemePreferences() {
  const { theme, setTheme } = useContext(Context);
  return (
    <div className="studio-segmented" aria-label="Tema de la interfaz">
      {(
        [
          ["system", "Sistema"],
          ["light", "Claro"],
          ["dark", "Oscuro"],
        ] as const
      ).map(([value, label]) => (
        <button
          type="button"
          key={value}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
