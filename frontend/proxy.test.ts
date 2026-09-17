import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function request(path: string, cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

describe("proxy guest routing", () => {
  it("sends unauthenticated / to /login with 307", () => {
    const response = proxy(request("/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("lets unauthenticated /login through", () => {
    const response = proxy(request("/login"));
    expect(response.status).toBe(200);
  });

  it("sends unauthenticated /deposit to /login with 307", () => {
    const response = proxy(request("/deposit"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("lets unauthenticated /deposit/callback through", () => {
    const response = proxy(request("/deposit/callback"));
    expect(response.status).toBe(200);
  });

  it("lets /deposit through when an unexpired session cookie is present", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
      "base64url",
    );
    const payload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");
    const response = proxy(
      request("/deposit", `poulix_session=${header}.${payload}.sig`),
    );
    expect(response.status).toBe(200);
  });

  it("lets /login through even when an unexpired session cookie is present", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
      "base64url",
    );
    const payload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");
    const response = proxy(
      request("/login", `poulix_session=${header}.${payload}.sig`),
    );
    expect(response.status).toBe(200);
  });
});
