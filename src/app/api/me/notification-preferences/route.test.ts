import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/notifications/preferences", () => ({
  getNotificationSettings: mocks.getNotificationSettings,
  updateNotificationSettings: mocks.updateNotificationSettings,
}));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const preferences = {
  comment_reply: true,
  thread_reply: false,
  new_follower: true,
  follow_request: true,
  follow_accepted: true,
  moderation: true,
  comment_like_milestone: true,
  list_save_milestone: false,
  artist_release: true,
  artist_release_announced: false,
  artist_single: false,
  artist_award: true,
};
const settings = { preferences, emailDigest: false, emailVerified: true };

function request(body: unknown) {
  return new NextRequest("http://localhost/api/me/notification-preferences", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/me/notification-preferences", () => {
  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.getNotificationSettings).not.toHaveBeenCalled();
  });

  it("devuelve las preferencias, el resumen y si el email está verificado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.getNotificationSettings.mockResolvedValue(settings);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(settings);
    expect(mocks.getNotificationSettings).toHaveBeenCalledWith(user.id);
  });
});

describe("PUT /api/me/notification-preferences", () => {
  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await PUT(request({ preferences: { thread_reply: false } }));

    expect(response.status).toBe(401);
    expect(mocks.updateNotificationSettings).not.toHaveBeenCalled();
  });

  it("guarda un cambio de tipos y devuelve los ajustes completos", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateNotificationSettings.mockResolvedValue(settings);

    const response = await PUT(request({ preferences: { thread_reply: false } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(settings);
    expect(mocks.updateNotificationSettings).toHaveBeenCalledWith(user.id, {
      preferences: { thread_reply: false },
    });
  });

  it("activa el resumen semanal", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateNotificationSettings.mockResolvedValue({
      ...settings,
      emailDigest: true,
    });

    const response = await PUT(request({ emailDigest: true }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ emailDigest: true });
    expect(mocks.updateNotificationSettings).toHaveBeenCalledWith(user.id, {
      emailDigest: true,
    });
  });

  it("activar el resumen sin el email verificado responde 409 EMAIL_NOT_VERIFIED", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateNotificationSettings.mockRejectedValue(
      new ApiError(
        "EMAIL_NOT_VERIFIED",
        409,
        "Verifica tu email para activar el resumen semanal",
      ),
    );

    const response = await PUT(request({ emailDigest: true }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("un tipo fijo responde 400 VALIDATION_ERROR", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateNotificationSettings.mockRejectedValue(
      new ApiError("VALIDATION_ERROR", 400, "Este tipo de notificación no se puede desactivar"),
    );

    const response = await PUT(request({ preferences: { moderation: false } }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it.each([
    [{}],
    [{ preferences: { moderation: "no" } }],
    [{ preferences: { inventado: false } }],
    [{ emailDigest: "si" }],
    [null],
  ])("rechaza el cuerpo %j con VALIDATION_ERROR", async (body) => {
    const response = await PUT(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.updateNotificationSettings).not.toHaveBeenCalled();
  });
});
