import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOwnProfile: vi.fn(),
  updateProfileVisibility: vi.fn(),
  updateIdentity: vi.fn(),
  updateAccountPreferences: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/social/profiles", () => ({
  getOwnProfile: mocks.getOwnProfile,
  updateProfileVisibility: mocks.updateProfileVisibility,
}));
vi.mock("@/services/profiles/identity", () => ({ updateIdentity: mocks.updateIdentity }));
vi.mock("@/services/profiles/account-settings", () => ({
  updateAccountPreferences: mocks.updateAccountPreferences,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const ownProfile = {
  id: user.id,
  username: "ana",
  displayName: null,
  email: "ana@example.com",
  profileVisibility: "public",
  defaultAudience: null,
};

function req(body: unknown) {
  return new NextRequest("http://localhost/api/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.getOwnProfile.mockResolvedValue(ownProfile);
});

describe("PATCH /api/me/profile", () => {
  it("actualiza solo la identidad", async () => {
    const res = await PATCH(req({ bio: "  Colecciono casetes  ", pronouns: "elle" }));
    expect(res.status).toBe(200);
    expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, {
      bio: "Colecciono casetes",
      pronouns: "elle",
    });
    expect(mocks.updateProfileVisibility).not.toHaveBeenCalled();
  });

  it("actualiza solo la visibilidad", async () => {
    await PATCH(req({ profileVisibility: "private" }));
    expect(mocks.updateProfileVisibility).toHaveBeenCalledWith(user.id, "private");
    expect(mocks.updateIdentity).not.toHaveBeenCalled();
  });

  it("acepta visibilidad e identidad a la vez", async () => {
    await PATCH(req({ profileVisibility: "private", location: "Rosario" }));
    expect(mocks.updateProfileVisibility).toHaveBeenCalledWith(user.id, "private");
    expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, { location: "Rosario" });
  });

  describe("país y pronombres (spec profile-personal-info)", () => {
    it("acepta un país de la lista y una clave de pronombres", async () => {
      const res = await PATCH(req({ country: "CL", pronounSet: "she" }));
      expect(res.status).toBe(200);
      expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, { country: "CL", pronounSet: "she" });
    });

    it("«Otro» con su texto llega al servicio, recortado", async () => {
      await PATCH(req({ pronounSet: "other", pronouns: "  ellx  " }));
      expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, { pronounSet: "other", pronouns: "ellx" });
    });

    it("acepta vaciar el país y los pronombres", async () => {
      await PATCH(req({ country: "", pronounSet: null }));
      expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, { country: "", pronounSet: null });
    });

    it.each([
      ["un país fuera de la lista", { country: "ZZ" }],
      ["un país escrito como nombre", { country: "Chile" }],
      ["un país en minúsculas", { country: "cl" }],
      ["una clave de pronombres fuera de la lista", { pronounSet: "xe" }],
      ["«Otro» sin texto", { pronounSet: "other" }],
      ["una clave de la lista junto a texto libre", { pronounSet: "she", pronouns: "ellx" }],
    ])("rechaza %s con VALIDATION_ERROR y no guarda nada", async (_name, body) => {
      const res = await PATCH(req(body));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
      expect(mocks.updateIdentity).not.toHaveBeenCalled();
    });

    it("los datos que no se piden se descartan: una petición que solo los trae se rechaza", async () => {
      for (const body of [{ birthYear: 1990 }, { gender: "x" }, { firstName: "Ana" }, { lastName: "Pérez" }]) {
        const res = await PATCH(req(body));
        expect(res.status).toBe(400);
      }
      expect(mocks.updateIdentity).not.toHaveBeenCalled();
    });
  });

  it("rechaza un body vacío con VALIDATION_ERROR", async () => {
    const res = await PATCH(req({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza una bio demasiado larga", async () => {
    const res = await PATCH(req({ bio: "x".repeat(201) }));
    expect(res.status).toBe(400);
    expect(mocks.updateIdentity).not.toHaveBeenCalled();
  });

  describe("nombre visible y audiencia por defecto (specs social-profiles y default-audience)", () => {
    it("actualiza solo el nombre visible", async () => {
      const res = await PATCH(req({ displayName: "  Ana Pérez  " }));
      expect(res.status).toBe(200);
      expect(mocks.updateAccountPreferences).toHaveBeenCalledWith(user.id, {
        displayName: "Ana Pérez",
        defaultAudience: undefined,
      });
      expect(mocks.updateIdentity).not.toHaveBeenCalled();
      expect(mocks.updateProfileVisibility).not.toHaveBeenCalled();
    });

    it("un nombre vacío llega como cadena vacía para que el servicio lo borre", async () => {
      await PATCH(req({ displayName: "   " }));
      expect(mocks.updateAccountPreferences).toHaveBeenCalledWith(user.id, {
        displayName: "",
        defaultAudience: undefined,
      });
    });

    it("acepta cada audiencia por defecto válida", async () => {
      for (const defaultAudience of ["private", "followers", "public"]) {
        mocks.updateAccountPreferences.mockClear();
        const res = await PATCH(req({ defaultAudience }));
        expect(res.status).toBe(200);
        expect(mocks.updateAccountPreferences).toHaveBeenCalledWith(user.id, {
          displayName: undefined,
          defaultAudience,
        });
      }
    });

    it("`defaultAudience: null` vuelve a 'según el tipo'", async () => {
      const res = await PATCH(req({ defaultAudience: null }));
      expect(res.status).toBe(200);
      expect(mocks.updateAccountPreferences).toHaveBeenCalledWith(user.id, {
        displayName: undefined,
        defaultAudience: null,
      });
    });

    it("rechaza una audiencia fuera de private, followers y public sin modificar datos", async () => {
      const res = await PATCH(req({ defaultAudience: "everyone" }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
      expect(mocks.updateAccountPreferences).not.toHaveBeenCalled();
    });

    it("rechaza un nombre visible de más de 50 caracteres", async () => {
      const res = await PATCH(req({ displayName: "x".repeat(51) }));
      expect(res.status).toBe(400);
      expect(mocks.updateAccountPreferences).not.toHaveBeenCalled();
    });

    it("combina con visibilidad e identidad en una sola petición", async () => {
      await PATCH(req({ profileVisibility: "private", displayName: "Ana", bio: "hola", defaultAudience: "followers" }));
      expect(mocks.updateProfileVisibility).toHaveBeenCalledWith(user.id, "private");
      expect(mocks.updateAccountPreferences).toHaveBeenCalledWith(user.id, {
        displayName: "Ana",
        defaultAudience: "followers",
      });
      expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, { bio: "hola" });
    });

    it("sin sesión responde 401 AUTH_REQUIRED y no modifica datos", async () => {
      mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa"));
      const res = await PATCH(req({ defaultAudience: "public" }));
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ code: "AUTH_REQUIRED" });
      expect(mocks.updateAccountPreferences).not.toHaveBeenCalled();
    });
  });
});

describe("PATCH /api/me/profile: zona horaria y hora local", () => {
  it("acepta una zona válida y la opción de mostrar la hora local", async () => {
    const res = await PATCH(req({ timezone: "America/Santiago", showLocalTime: true }));
    expect(res.status).toBe(200);
    expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, { timezone: "America/Santiago", showLocalTime: true });
  });

  it("vaciar la zona con cadena vacía es válido", async () => {
    const res = await PATCH(req({ timezone: "" }));
    expect(res.status).toBe(200);
    expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, { timezone: "" });
  });

  it.each(["hora de mi casa", "Mars/Olympus"])("rechaza la zona %s con un error de validación", async (timezone) => {
    const res = await PATCH(req({ timezone }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.updateIdentity).not.toHaveBeenCalled();
  });
});
