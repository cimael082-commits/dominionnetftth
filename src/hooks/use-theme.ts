import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "dominion_theme";

/** Lê o tema salvo; padrão escuro (identidade visual da Dominion Net). */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" ? v : "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Hook de tema claro/escuro persistido em localStorage. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const t = getStoredTheme();
    setThemeState(t);
    applyTheme(t);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage indisponível — tema continua válido na sessão */
    }
  }

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
