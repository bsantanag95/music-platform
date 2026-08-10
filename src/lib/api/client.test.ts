import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import { apiFetch } from "./client";

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const schema = z.object({ name: z.string() });

  it("devuelve datos parseados cuando la respuesta es 2xx y cumple el schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: "Pink Floyd" }), { status: 200 })),
    );

    const result = await apiFetch("/api/x", schema);
    expect(result).toEqual({ name: "Pink Floyd" });
  });

  it("devuelve null cuando una respuesta 204 no tiene body y el schema acepta respuestas vacías", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiFetch("/api/x", z.null(), { method: "DELETE" })).resolves.toBeNull();
  });

  it("lanza ApiError tipado con el code del backend ante un 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "No se encontró", code: "ARTIST_NOT_FOUND" }), {
          status: 404,
        }),
      ),
    );

    await expect(apiFetch("/api/x", schema)).rejects.toMatchObject({
      code: "ARTIST_NOT_FOUND",
      status: 404,
    });
  });

  it("cae a INTERNAL_ERROR si una respuesta 2xx no cumple el schema esperado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ unexpected: true }), { status: 200 })),
    );

    await expect(apiFetch("/api/x", schema)).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("lanza ApiError tipado ante un error de un endpoint de respuesta vacía", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "No se encontró", code: "COMMENT_NOT_FOUND" }), {
          status: 404,
        }),
      ),
    );

    await expect(apiFetch("/api/x", z.null(), { method: "DELETE" })).rejects.toMatchObject({
      code: "COMMENT_NOT_FOUND",
      status: 404,
    });
  });

  it("cae a INTERNAL_ERROR si el body de error no tiene el shape { error, code }", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no es json", { status: 500 })));

    await expect(apiFetch("/api/x", schema)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500,
    });
  });
});
