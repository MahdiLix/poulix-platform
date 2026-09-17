"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDocumentTheme,
  DEFAULT_THEME,
  readThemeCookie,
  writeThemeCookie,
  type ThemePreference,
} from "./theme-cookie";

type ThemeContextType = {
  theme: ThemePreference;
  resolvedTheme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: {
  children: ReactNode;
  initialTheme?: ThemePreference;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);

  const setTheme = useCallback((next: ThemePreference) => {
    const resolved: ThemePreference = next === "dark" ? "dark" : "light";
    applyDocumentTheme(resolved);
    writeThemeCookie(resolved);
    setThemeState(resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ThemePreference = current === "dark" ? "light" : "dark";
      applyDocumentTheme(next);
      writeThemeCookie(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const fromCookie = readThemeCookie();
    if (fromCookie !== theme) {
      setThemeState(fromCookie);
    }
    applyDocumentTheme(fromCookie);
    // Sync once after boot script may have persisted a resolved light/dark cookie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
