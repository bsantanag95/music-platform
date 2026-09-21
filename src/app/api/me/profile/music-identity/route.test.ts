import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  updateMusicIdentity: vi.fn(),
  replacePrompts: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/music-identity", () => ({
  updateMusicIdentity: mocks.updateMusicIdentity,
  replacePrompts: mocks.replacePrompts,
}));

import { PUT as putMusicIdentity } from "./route";
import { DELETE as deletePrompts, PUT as putPrompts } from "../prompts/route";

function req(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/me/profile/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
  mocks.updateMusicIdentity.mockResolvedValue({ selfRoles: ["dj"], genres: [], listeningFormats: [] });
  mocks.replacePrompts.mockResolvedValue([]);
});

describe("PUT /api/me/profile/music-identity", () => {
  it("guarda los campos enviados y devuelve el estado guardado", async () => {
    const res = await putMusicIdentity(req("PUT", { selfRoles: ["dj"], genres: ["jazz"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ selfRoles: ["dj"], genres: [], listeningFormats: [] });
    expect(mocks.updateMusicIdentity).toHaveBeenCalledWith("u1", { selfRoles: ["dj"], genres: ["jazz"] });
  });

  it.each([
    ["un cuarto rol", { selfRoles: ["listener", "collector", "musician", "dj"] }],
    ["un rol desconocido", { selfRoles: ["admin"] }],
    ["un sexto género", { genres: ["rock", "punk", "jazz", "folk", "blues", "pop"] }],
    ["un formato desconocido", { listeningFormats: ["8-track"] }],
    ["repetidos", { genres: ["jazz", "jazz"] }],
    ["un cuerpo vacío", {}],
  ])("rechaza %s con un error de validación", async (_name, body) => {
    const res = await putMusicIdentity(req("PUT", body));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.updateMusicIdentity).not.toHaveBeenCalled();
  });

  it("exige sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await putMusicIdentity(req("PUT", { genres: [] }))).status).toBe(401);
  });
});

describe("PUT y DELETE /api/me/profile/prompts", () => {
  it("reemplaza el conjunto y devuelve las preguntas guardadas", async () => {
    mocks.replacePrompts.mockResolvedValue([{ promptKey: "first-record", answer: "Un casete", position: 0 }]);
    const res = await putPrompts(req("PUT", { prompts: [{ promptKey: "first-record", answer: "  Un casete  " }] }));
    expect(res.status).toBe(200);
    expect((await res.json()).prompts).toHaveLength(1);
    expect(mocks.replacePrompts).toHaveBeenCalledWith("u1", [{ promptKey: "first-record", answer: "Un casete" }]);
  });

  it.each([
    ["una respuesta de 101 caracteres", { prompts: [{ promptKey: "first-record", answer: "x".repeat(101) }] }],
    ["una pregunta desconocida", { prompts: [{ promptKey: "nope", answer: "x" }] }],
    ["una respuesta con salto de línea", { prompts: [{ promptKey: "first-record", answer: "a\nb" }] }],
    [
      "la misma pregunta dos veces",
      {
        prompts: [
          { promptKey: "first-record", answer: "a" },
          { promptKey: "first-record", answer: "b" },
        ],
      },
    ],
    [
      "una cuarta pregunta",
      {
        prompts: ["first-record", "sunday-record", "defended-song", "guilty-pleasure"].map((promptKey) => ({
          promptKey,
          answer: "x",
        })),
      },
    ],
    ["un cuerpo sin prompts", {}],
  ])("rechaza %s", async (_name, body) => {
    const res = await putPrompts(req("PUT", body));
    expect(res.status).toBe(400);
    expect(mocks.replacePrompts).not.toHaveBeenCalled();
  });

  it("DELETE quita todas las preguntas", async () => {
    const res = await deletePrompts();
    expect(res.status).toBe(200);
    expect(mocks.replacePrompts).toHaveBeenCalledWith("u1", []);
  });

  it("exige sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await putPrompts(req("PUT", { prompts: [] }))).status).toBe(401);
  });
});
