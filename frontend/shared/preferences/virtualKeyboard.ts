const STORAGE_KEY = "poulix_virtual_keyboard";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function isVirtualKeyboardEnabled(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(STORAGE_KEY) === "1";
}

export function setVirtualKeyboardEnabled(enabled: boolean) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new Event("poulix:virtual-keyboard"));
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}
