import { en } from "./messages/en";
import { fa } from "./messages/fa";
import type {
  AppMessages,
  FlatMessages,
  Language,
  MessageCategories,
  TranslationDictionary,
} from "./messages/types";

export type {
  AppMessages,
  FlatMessages,
  Language,
  MessageCategories,
  TranslationDictionary,
};

export const translations: Record<Language, TranslationDictionary> = {
  en,
  fa,
};
