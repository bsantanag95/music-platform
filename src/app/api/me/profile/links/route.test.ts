import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  replaceLinks: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/identity", () => ({ replaceLinks: mocks.replaceLinks }));

const user = { id: "00000000-0000-4000-8000-000000000001" };

function put(body: unknown) {
  return new NextRequest("http://localhost/api/me/profile/links", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
});

describe("PUT /api/me/profile/links", () => {
  it("reemplaza el conjunto y devuelve los enlaces persistidos", async () => {
    const links = [{ id: "l1", kind: "other", url: "https://ana.example", position: 0 }];
    mocks.replaceLinks.mockResolvedValue(links);

    const res = await PUT(put({ links: [{ kind: "other", value: "https://ana.example" }] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ links });
    expect(mocks.replaceLinks).toHaveBeenCalledWith(user.id, [
      { kind: "other", value: "https://ana.example" },
    ]);
  });

  it("rechaza un sexto enlace con VALIDATION_ERROR", async () => {
    const links = Array.from({ length: 6 }, (_, i) => ({
      kind: "other",
      value: `https://x${i}.example`,
    }));
    const res = await PUT(put({ links }));
    expect(res.status).toBe(400);
    expect(mocks.replaceLinks).not.toHaveBeenCalled();
  });

  it("rechaza una URL no http(s)", async () => {
    const res = await PUT(put({ links: [{ kind: "other", value: "ftp://ana.example" }] }));
    expect(res.status).toBe(400);
    expect(mocks.replaceLinks).not.toHaveBeenCalled();
  });

  it("acepta un enlace sin esquema (www.link.com) y lo entrega tal cual al servicio", async () => {
    mocks.replaceLinks.mockResolvedValue([]);
    const res = await PUT(put({ links: [{ kind: "other", value: "www.link.com" }] }));
    expect(res.status).toBe(200);
    expect(mocks.replaceLinks).toHaveBeenCalledWith(user.id, [{ kind: "other", value: "www.link.com" }]);
  });

  it("acepta los tipos nuevos X, TikTok y Spotify", async () => {
    mocks.replaceLinks.mockResolvedValue([]);
    const res = await PUT(
      put({
        links: [
          { kind: "x", value: "@ana" },
          { kind: "tiktok", value: "@ana" },
          { kind: "spotify", value: "31abcd" },
        ],
      }),
    );
    expect(res.status).toBe(200);
  });

  it("acepta un enlace completo del sitio correcto para un tipo por usuario", async () => {
    mocks.replaceLinks.mockResolvedValue([]);
    const res = await PUT(put({ links: [{ kind: "instagram", value: "https://instagram.com/ana" }] }));
    expect(res.status).toBe(200);
  });

  it.each([
    ["instagram", "https://tiktok.com/@ana"],
    ["instagram", "instagram.com"],
    ["instagram", "http://instagram.com"],
    ["youtube", "https://www.youtube.com/channel/UC123"],
    ["bandcamp", "mi banda"],
    ["other", "javascript:alert(1)"],
    ["other", "hola"],
  ])("rechaza %s ← %s con VALIDATION_ERROR", async (kind, value) => {
    const res = await PUT(put({ links: [{ kind, value }] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.replaceLinks).not.toHaveBeenCalled();
  });

  it("el tipo 'website' ya no existe: se unificó en 'other' (Enlace)", async () => {
    const res = await PUT(put({ links: [{ kind: "website", value: "https://ana.example" }] }));
    expect(res.status).toBe(400);
    expect(mocks.replaceLinks).not.toHaveBeenCalled();
  });

  it("rechaza el contrato antiguo { kind, url } (ahora es { kind, value })", async () => {
    const res = await PUT(put({ links: [{ kind: "other", url: "https://ana.example" }] }));
    expect(res.status).toBe(400);
  });

  it("rechaza un valor de más de 400 caracteres", async () => {
    const res = await PUT(put({ links: [{ kind: "other", value: `https://a.example/${"x".repeat(400)}` }] }));
    expect(res.status).toBe(400);
  });

  it("sin sesión responde 401 y no modifica datos", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa"));
    const res = await PUT(put({ links: [] }));
    expect(res.status).toBe(401);
    expect(mocks.replaceLinks).not.toHaveBeenCalled();
  });

  it("DELETE vacía todos los enlaces", async () => {
    mocks.replaceLinks.mockResolvedValue([]);
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mocks.replaceLinks).toHaveBeenCalledWith(user.id, []);
    expect(await res.json()).toEqual({ links: [] });
  });
});
