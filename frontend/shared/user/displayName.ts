import type { AuthUser } from "@/shared/api";

export type NamedUser = {
  username?: string | null;
  email?: string | null;
} | null | undefined;

export function getDisplayName(
  user: NamedUser,
  fallback = "Guest",
): string {
  const username = user?.username?.trim();
  if (username) return username;

  const email = user?.email?.trim();
  if (email) {
    const local = email.split("@")[0];
    return local || email;
  }

  return fallback;
}

export function getUserInitials(user: NamedUser): string {
  const name = getDisplayName(user, "U");
  const letters = name.replace(/[^A-Za-z0-9\u0600-\u06FF]/g, "");
  return (letters.slice(0, 2) || "U").toUpperCase();
}

export function isolateText(value: string) {
  return `\u2068${value}\u2069`;
}
