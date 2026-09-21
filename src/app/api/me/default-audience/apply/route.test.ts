import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  previewApplyAudience: vi.fn(),
  applyAudienceToExisting: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/social/apply-audience", () => ({
  previewApplyAudience: mocks.previewApplyAudience,
  applyAudienceToExisting: mocks.applyAudienceToExisting,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };

const preview = {
  audience: "private",
  favorites: 3,
  diary: 5,
  lists: 2,
  collection: 1,
  highlighted: { pinnedLists: 1, pinnedAlbumFavorites: 0, highlightedDiary: 2 },
};
const result = { audience: "private", favorites: 3, diary: 5, lists: 2, collection: 1 };

function get(query: string) {
  return new NextRequest(`http://localhost/api/me/default-audience/apply${query}`);
}

function post(body: unknown) {
  return new NextRequest("http://localhost/api/me/default-audience/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.previewApplyAudience.mockResolvedValue(preview);
  mocks.applyAudienceToExisting.mockResolvedValue(result);
});

describe("GET /api/me/default-audience/apply (vista previa)", () => {
  it("devuelve los conteos de lo que cambiaría, con el usuario de la sesión", async () => {
    const res = await GET(get("?audience=private"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(preview);
    expect(mocks.previewApplyAudience).toHaveBeenCalledWith(user.id, "private");
    expect(mocks.applyAudienceToExisting).not.toHaveBeenCalled();
  });

  it.each(["public", "followers", "private"])("acepta la audiencia %s", async (audience) => {
    const res = await GET(get(`?audience=${audience}`));
    expect(res.status).toBe(200);
  });

  it.each(["", "?audience=", "?audience=auto", "?audience=null", "?audience=PUBLIC", "?audience=todos"])(
    "responde 400 VALIDATION_ERROR con %j sin consultar nada",
    async (query) => {
      const res = await GET(get(query));

      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("VALIDATION_ERROR");
      expect(mocks.previewApplyAudience).not.toHaveBeenCalled();
    },
  );

  it("responde 401 AUTH_REQUIRED sin sesión, aunque la audiencia sea inválida", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere sesión"));

    const res = await GET(get("?audience=auto"));

    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("AUTH_REQUIRED");
    expect(mocks.previewApplyAudience).not.toHaveBeenCalled();
  });
});

describe("POST /api/me/default-audience/apply", () => {
  it("aplica la audiencia y devuelve los conteos, con el usuario de la sesión", async () => {
    const res = await POST(post({ audience: "private" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(mocks.applyAudienceToExisting).toHaveBeenCalledWith(user.id, "private");
  });

  it("ignora un userId enviado en el cuerpo: solo actúa sobre la sesión", async () => {
    await POST(post({ audience: "public", userId: "otro-usuario" }));

    expect(mocks.applyAudienceToExisting).toHaveBeenCalledWith(user.id, "public");
  });

  it.each([
    { audience: null },
    { audience: "auto" },
    { audience: "PUBLIC" },
    { audience: 1 },
    {},
    "no es json",
    "null",
  ])("responde 400 VALIDATION_ERROR con el cuerpo %j sin modificar nada", async (body) => {
    const res = await POST(post(body));

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.applyAudienceToExisting).not.toHaveBeenCalled();
  });

  it("responde 401 AUTH_REQUIRED sin sesión y no modifica nada", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere sesión"));

    const res = await POST(post({ audience: "private" }));

    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("AUTH_REQUIRED");
    expect(mocks.applyAudienceToExisting).not.toHaveBeenCalled();
  });

  it("propaga un error del servicio con su código", async () => {
    mocks.applyAudienceToExisting.mockRejectedValue(
      new ApiError("VALIDATION_ERROR", 400, "La audiencia no es válida"),
    );

    const res = await POST(post({ audience: "private" }));

    expect(res.status).toBe(400);
  });
});
