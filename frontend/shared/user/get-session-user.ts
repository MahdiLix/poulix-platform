import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/shared/api";
import { isCredentialPath, isPublicAuthPath } from "@/shared/user/session";
import { PATHNAME_HEADER } from "@/shared/user/pathname-header";

const SESSION_COOKIE = "poulix_session";

function backendOrigin() {
  return (process.env.BACKEND_URL || "http://backend:3001").replace(/\/$/, "");
}

function readSessionToken(
  cookieStore: { get: (name: string) => { value: string } | undefined },
  cookieHeader?: string | null,
): string | undefined {
  const fromStore = cookieStore.get(SESSION_COOKIE)?.value;
  if (fromStore) return fromStore;
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${SESSION_COOKIE}=`)) continue;
    const raw = trimmed.slice(SESSION_COOKIE.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  return undefined;
}

async function getSessionUser(): Promise<{
  user: AuthUser | null;
  unauthorized: boolean;
}> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = readSessionToken(cookieStore, headerStore.get("cookie"));
  if (!token) return { user: null, unauthorized: false };

  try {
    const response = await fetch(`${backendOrigin()}/users/me`, {
      headers: {
        Accept: "application/json",
        Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      return { user: null, unauthorized: true };
    }
    if (!response.ok) {
      return { user: null, unauthorized: false };
    }

    return {
      user: (await response.json()) as AuthUser,
      unauthorized: false,
    };
  } catch {
    return { user: null, unauthorized: false };
  }
}

export async function loadLayoutSession() {
  const headerStore = await headers();
  const pathname = headerStore.get(PATHNAME_HEADER) ?? "";
  const { user, unauthorized } = await getSessionUser();

  if (isCredentialPath(pathname)) {
    if (user) {
      redirect("/");
    }
    return { user: null, pathname };
  }

  if (isPublicAuthPath(pathname)) {
    return { user, pathname };
  }

  if (pathname && unauthorized) {
    redirect("/login");
  }

  return { user, pathname };
}
