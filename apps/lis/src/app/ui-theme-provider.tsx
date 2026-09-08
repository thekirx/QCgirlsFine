"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export type UITheme = "modern" | "classic";
export const UI_THEME_STORAGE_KEY = "optrizo-ui-theme";
const UI_THEME_CHANGE_EVENT = "optrizo-ui-theme-change";

type UIThemeContextValue = {
  theme: UITheme;
  selectTheme: (theme: UITheme) => void;
};

const UIThemeContext = createContext<UIThemeContextValue | null>(null);

function isUITheme(value: string | undefined): value is UITheme {
  return value === "modern" || value === "classic";
}

function subscribeToUITheme(onStoreChange: () => void) {
  window.addEventListener(UI_THEME_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(UI_THEME_CHANGE_EVENT, onStoreChange);
}

function getClientUITheme(): UITheme {
  const currentTheme = document.documentElement.dataset.uiTheme;
  return isUITheme(currentTheme) ? currentTheme : "modern";
}

function getServerUITheme(): UITheme {
  return "modern";
}

export function UIThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToUITheme,
    getClientUITheme,
    getServerUITheme,
  );

  const selectTheme = useCallback((nextTheme: UITheme) => {
    document.documentElement.dataset.uiTheme = nextTheme;
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(UI_THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ theme, selectTheme }), [theme, selectTheme]);
  return <UIThemeContext.Provider value={value}>{children}</UIThemeContext.Provider>;
}

export function useUITheme() {
  const context = useContext(UIThemeContext);
  if (!context) throw new Error("useUITheme must be used within UIThemeProvider");
  return context;
}
