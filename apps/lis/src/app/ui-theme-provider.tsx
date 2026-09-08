"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type UITheme = "modern" | "classic";
export const UI_THEME_STORAGE_KEY = "optrizo-ui-theme";

type UIThemeContextValue = {
  theme: UITheme;
  selectTheme: (theme: UITheme) => void;
};

const UIThemeContext = createContext<UIThemeContextValue | null>(null);

function isUITheme(value: string | undefined): value is UITheme {
  return value === "modern" || value === "classic";
}

export function UIThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<UITheme>("modern");

  useEffect(() => {
    const restored = document.documentElement.dataset.uiTheme;
    if (isUITheme(restored)) setTheme(restored);
  }, []);

  const selectTheme = useCallback((nextTheme: UITheme) => {
    setTheme(nextTheme);
    document.documentElement.dataset.uiTheme = nextTheme;
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, selectTheme }), [theme, selectTheme]);
  return <UIThemeContext.Provider value={value}>{children}</UIThemeContext.Provider>;
}

export function useUITheme() {
  const context = useContext(UIThemeContext);
  if (!context) throw new Error("useUITheme must be used within UIThemeProvider");
  return context;
}
