import { afterEach, describe, expect, it } from "vitest";
import {
  isMobileViewport,
  isVirtualKeyboardEnabled,
  setVirtualKeyboardEnabled,
} from "@/shared/preferences/virtualKeyboard";

const store = new Map<string, string>();

function installMemoryStorage() {
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } satisfies Storage;
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
}

describe("virtual keyboard preference", () => {
  afterEach(() => {
    store.clear();
  });

  it("defaults off and persists the user preference", () => {
    installMemoryStorage();
    expect(isVirtualKeyboardEnabled()).toBe(false);
    setVirtualKeyboardEnabled(true);
    expect(isVirtualKeyboardEnabled()).toBe(true);
  });

  it("treats tablet and phone widths as keypad viewports", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("1279"),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }),
    });
    expect(isMobileViewport()).toBe(true);
  });
});
