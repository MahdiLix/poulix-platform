import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookies = vi.fn();
const headers = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => cookies(...args),
  headers: (...args: unknown[]) => headers(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

function mockCookies(token?: string) {
  cookies.mockResolvedValue({
    get: (name: string) =>
      name === "poulix_session" && token ? { value: token } : undefined,
  });
}

function mockPath(pathname: string) {
  headers.mockResolvedValue({
    get: (name: string) => (name === "x-poulix-pathname" ? pathname : null),
  });
}

describe("loadLayoutSession", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    cookies.mockReset();
    headers.mockReset();
    redirect.mockClear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("does not probe the backend when the session cookie is missing", async () => {
    mockCookies();
    mockPath("/");
    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not redirect normal app routes before HTML when /users/me is unauthorized", async () => {
    mockCookies("stale-token");
    mockPath("/");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({}),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not redirect public auth routes on 401 and does not render as authenticated", async () => {
    mockCookies("stale-token");
    mockPath("/login");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({}),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(global.fetch).toHaveBeenCalledOnce();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not probe /users/me on public auth routes without a session cookie", async () => {
    mockCookies();
    mockPath("/login");
    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends authenticated visitors away from /login before HTML", async () => {
    mockCookies("live-token");
    mockPath("/login");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        id: "user-1",
        email: "sara@poulix.test",
      }),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    await expect(loadLayoutSession()).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("keeps authenticated ZarinPal returns on /deposit/callback", async () => {
    mockCookies("live-token");
    mockPath("/deposit/callback");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        id: "user-1",
        email: "sara@poulix.test",
      }),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user?.id).toBe("user-1");
    expect(result.pathname).toBe("/deposit/callback");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not send invalid sessions from /deposit/callback to /login", async () => {
    mockCookies("stale-token");
    mockPath("/deposit/callback");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({}),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not redirect normal app routes on 403", async () => {
    mockCookies("stale-token");
    mockPath("/");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 403,
      ok: false,
      json: async () => ({}),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns the session user for an authenticated request", async () => {
    mockCookies("live-token");
    mockPath("/");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        id: "user-1",
        email: "sara@poulix.test",
      }),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user?.id).toBe("user-1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not force login when the backend is unreachable", async () => {
    mockCookies("live-token");
    mockPath("/");
    vi.mocked(global.fetch).mockRejectedValue(new Error("ECONNREFUSED"));

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not redirect /deposit when the session is unauthorized", async () => {
    mockCookies("stale-token");
    mockPath("/deposit");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({}),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects /admin when the session is unauthorized", async () => {
    mockCookies("stale-token");
    mockPath("/admin");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({}),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    await expect(loadLayoutSession()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("does not force login when /users/me returns 500 on /deposit", async () => {
    mockCookies("live-token");
    mockPath("/deposit");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({}),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not force login when /users/me returns 503", async () => {
    mockCookies("live-token");
    mockPath("/");
    vi.mocked(global.fetch).mockResolvedValue({
      status: 503,
      ok: false,
      json: async () => ({}),
    } as Response);

    const { loadLayoutSession } = await import("./get-session-user");
    const result = await loadLayoutSession();
    expect(result.user).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });
});
