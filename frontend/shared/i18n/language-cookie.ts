import { readUiCookie, writeUiCookie } from "@/shared/preferences/ui-cookie";
import type { Language } from "./translations";

export const LANGUAGE_COOKIE = "poulix_lang";
export const DEFAULT_LANGUAGE: Language = "en";

export function parseLanguageCookie(value?: string | null): Language {
  return value === "fa" ? "fa" : DEFAULT_LANGUAGE;
}

export function languageDirection(language: Language): "ltr" | "rtl" {
  return language === "fa" ? "rtl" : "ltr";
}

export function readLanguageCookie(): Language {
  return parseLanguageCookie(readUiCookie(LANGUAGE_COOKIE));
}

export function writeLanguageCookie(language: Language) {
  writeUiCookie(LANGUAGE_COOKIE, language);
}
