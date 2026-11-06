// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAuthAttempts } from "@/services/auth/rate-limit";

const mocks = vi.hoisted(() => ({ load: vi.fn(), render: vi.fn(), version: vi.fn(), session: vi.fn(), own: vi.fn() }));

vi.mock("@/services/share/targets", () => ({ loadShareTarget: mocks.load, shareTargetVersion: mocks.version }));
vi.mock("@/services/share/render", () => ({ renderShareImage: mocks.render }));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.session }));
vi.mock("@/services/share/own", () => ({
  isOwnShareKind: (value: string) => value === "rating" || value === "listen",
  loadOwnTarget: mocks.own,
}));

import { GET } from "./route";

const target = { kind: "album", ref: "rg1", downloadName: "metallica-master-of-puppets" };

function call(kind: string, ref: string, query = "", ip = "203.0.113.9") {
  const req = new NextRequest(`http://localhost/api/share/image/${kind}/${ref}${query}`);
  Object.defineProperty(req, "ip", { value: ip });
  return GET(req, { params: Promise.resolve({ kind, ref }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAuthAttempts();
  mocks.load.mockResolvedValue(target);
  mocks.version.mockReturnValue("abc123def456");
  mocks.render.mockImplementation(async (_t: unknown, _l: unknown, options: { headers: Record<string, string> }) =>
    new Response("png", { headers: { "Content-Type": "image/png", ...options.headers } }),
  );
});

describe("GET /api/share/image/[kind]/[ref]", () => {
  it("con la versión vigente responde con caché inmutable", async () => {
    const res = await call("album", "rg1", "?locale=es&format=link&v=abc123def456");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(mocks.load).toHaveBeenCalledWith("album", "rg1", "es");
  });

  it("pide caché corta si la imagen sale degradada", async () => {
    await call("album", "rg1", "?v=abc123def456");
    expect(mocks.render).toHaveBeenCalledWith(target, "es", expect.objectContaining({ degradedCacheControl: "public, max-age=300" }));
  });

  it("con una versión vieja o sin versión, genera con los datos actuales y caché corta", async () => {
    expect((await call("album", "rg1", "?v=viejo")).headers.get("Cache-Control")).toBe("public, max-age=300");
    expect((await call("album", "rg1")).headers.get("Cache-Control")).toBe("public, max-age=300");
  });

  it("un objeto que no se puede ver responde 200 con la imagen genérica", async () => {
    mocks.load.mockResolvedValue(null);
    const res = await call("profile", "u1", "?locale=en");
    expect(res.status).toBe(200);
    expect(mocks.render).toHaveBeenCalledWith(null, "en", expect.anything());
  });

  it.each(["review", "comment", "list", "camino", "user_collection", "fingerprint", "profile", "rating", "listen"])(
    "lo de una persona (%s) nunca es inmutable: se puede cerrar",
    async (kind) => {
      const res = await call(kind, "r1", "?v=abc123def456");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    },
  );

  it.each(["album", "song", "artist", "genre", "ceremony", "hall_class", "collection"])("el catálogo (%s) sí", async (kind) => {
    const res = await call(kind, "x", "?v=abc123def456");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("pasa el formato al renderizador y nombra la descarga", async () => {
    const res = await call("album", "rg1", "?format=story&download=1");
    expect(mocks.render).toHaveBeenCalledWith(target, "es", expect.objectContaining({ format: "story" }));
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="metallica-master-of-puppets-story.png"');
  });

  describe("imagen privada del dueño", () => {
    it("con su sesión usa su objetivo y nunca una caché compartida", async () => {
      mocks.session.mockResolvedValue({ user: { id: "u1" } });
      mocks.own.mockResolvedValue(target);
      const res = await call("rating", "r1", "?personal=1");
      expect(mocks.own).toHaveBeenCalledWith("rating", "r1", "es", "u1");
      expect(mocks.load).not.toHaveBeenCalled();
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(mocks.render).toHaveBeenCalledWith(target, "es", expect.anything());
    });

    it("a otra persona o sin sesión le da la genérica", async () => {
      mocks.session.mockResolvedValue({ user: { id: "otra" } });
      mocks.own.mockResolvedValue(null);
      await call("rating", "r1", "?personal=1");
      expect(mocks.render).toHaveBeenLastCalledWith(null, "es", expect.anything());
      mocks.session.mockResolvedValue(null);
      const res = await call("rating", "r1", "?personal=1");
      expect(mocks.render).toHaveBeenLastCalledWith(null, "es", expect.anything());
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    });

    it("también en Historia", async () => {
      mocks.session.mockResolvedValue({ user: { id: "u1" } });
      mocks.own.mockResolvedValue(target);
      const res = await call("rating", "r1", "?personal=1&format=story");
      expect(mocks.render).toHaveBeenCalledWith(target, "es", expect.objectContaining({ format: "story" }));
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    });

    it("no aplica a otros tipos", async () => {
      await call("album", "rg1", "?personal=1");
      expect(mocks.session).not.toHaveBeenCalled();
      expect(mocks.render).toHaveBeenCalledWith(null, "es", expect.anything());
    });
  });

  it("descarga con nombre legible", async () => {
    const res = await call("album", "rg1", "?download=1");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="metallica-master-of-puppets.png"');
  });

  it.each([
    ["tipo desconocido", "podcast", "x", ""],
    ["formato no disponible", "album", "rg1", "?format=square"],
    ["idioma desconocido", "album", "rg1", "?locale=fr"],
  ])("rechaza %s con VALIDATION_ERROR", async (_label, kind, ref, query) => {
    const res = await call(kind, ref, query);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("limita a 60 imágenes por minuto por IP", async () => {
    for (let i = 0; i < 60; i++) expect((await call("album", "rg1")).status).toBe(200);
    const over = await call("album", "rg1");
    expect(over.status).toBe(429);
    expect((await over.json()).code).toBe("RATE_LIMITED");
    expect((await call("album", "rg1", "", "198.51.100.4")).status).toBe(200);
  });
});
