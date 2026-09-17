import { readUiCookie, writeUiCookie } from "@/shared/preferences/ui-cookie";

export const THEME_COOKIE = "poulix_theme";
export type ThemePreference = "light" | "dark";

export const DEFAULT_THEME: ThemePreference = "light";

export function parseThemeCookie(value?: string | null): ThemePreference {
  return value === "dark" ? "dark" : DEFAULT_THEME;
}

export function themeClassName(theme: ThemePreference): "dark" | "" {
  return theme === "dark" ? "dark" : "";
}

export function readThemeCookie(): ThemePreference {
  return parseThemeCookie(readUiCookie(THEME_COOKIE));
}

export function writeThemeCookie(theme: ThemePreference) {
  writeUiCookie(THEME_COOKIE, theme === "dark" ? "dark" : "light");
}

const DISABLE_THEME_TRANSITIONS =
  "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}";

function releaseThemeSwitchStyles(style: HTMLStyleElement) {
  style.remove();
}

export function applyDocumentTheme(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved: ThemePreference = theme === "dark" ? "dark" : "light";

  document
    .querySelectorAll("style[data-poulix-theme-switch]")
    .forEach((node) => node.remove());

  const style = document.createElement("style");
  style.setAttribute("data-poulix-theme-switch", "");
  style.appendChild(document.createTextNode(DISABLE_THEME_TRANSITIONS));
  document.head.appendChild(style);

  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;

  // Tailwind `transition` interpolates color/background when CSS variables
  // change. Force the new theme to compute while transitions are off so the
  // click path paints the new colors immediately.
  void root.offsetHeight;

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => releaseThemeSwitchStyles(style)),
    );
  } else {
    setTimeout(() => releaseThemeSwitchStyles(style), 0);
  }
}
