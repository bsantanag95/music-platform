import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  listNotificationGroups: vi.fn(),
  pruneNotifications: vi.fn().mockResolvedValue(undefined),
  requireUser: vi.fn(),
  after: vi.fn(),
}));

// `after()` solo existe dentro de una request de Next: se stubea para poder
// invocar el handler suelto y comprobar que la poda queda programada.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: mocks.after };
});
vi.mock("@/services/notifications/read", () => ({
  listNotificationGroups: mocks.listNotificationGroups,
  pruneNotifications: mocks.pruneNotifications,
}));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const page = {
  groups: [
    {
      id: "thread:root",
      kind: "comment_reply",
      lastAt: "2026-10-23T10:00:00.000Z",
      unread: true,
      eventCount: 1,
      actorCount: 1,
      actors: [],
      target: null,
    },
  ],
  nextCursor: "2026-10-22T10:00:00.000Z|thread:root",
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/me/notifications", () => {
  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await GET(new NextRequest("http://localhost/api/me/notifications"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.listNotificationGroups).not.toHaveBeenCalled();
  });

  it("lista las entradas del usuario de la sesión con cursor y zona", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listNotificationGroups.mockResolvedValue(page);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/me/notifications?cursor=2026-10-22T10%3A00%3A00.000Z%7Cthread%3Aroot&tz=America%2FSantiago",
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(page);
    expect(mocks.listNotificationGroups).toHaveBeenCalledWith(user.id, {
      cursor: "2026-10-22T10:00:00.000Z|thread:root",
      timeZone: "America/Santiago",
      tab: "for_you",
    });
  });

  it("con tab=releases pide solo las novedades", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listNotificationGroups.mockResolvedValue({ groups: [], nextCursor: null });

    const response = await GET(
      new NextRequest("http://localhost/api/me/notifications?tab=releases"),
    );

    expect(response.status).toBe(200);
    expect(mocks.listNotificationGroups).toHaveBeenCalledWith(user.id, {
      cursor: null,
      timeZone: undefined,
      tab: "releases",
    });
  });

  it("rechaza una pestaña desconocida sin consultar el servicio", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/me/notifications?tab=otra"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listNotificationGroups).not.toHaveBeenCalled();
  });

  it("programa la poda al responder, no antes", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listNotificationGroups.mockResolvedValue({ groups: [], nextCursor: null });

    await GET(new NextRequest("http://localhost/api/me/notifications"));

    expect(mocks.pruneNotifications).not.toHaveBeenCalled();
    expect(mocks.after).toHaveBeenCalledTimes(1);
    const task = mocks.after.mock.calls[0]![0] as () => Promise<void>;
    await task();
    expect(mocks.pruneNotifications).toHaveBeenCalledWith(user.id);
  });

  it("rechaza una zona horaria desconocida sin consultar el servicio", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/me/notifications?tz=Marte%2FBase"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listNotificationGroups).not.toHaveBeenCalled();
  });

  it("propaga el cursor inválido del servicio como VALIDATION_ERROR", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listNotificationGroups.mockRejectedValue(
      new ApiError("VALIDATION_ERROR", 400, 'El valor de "cursor" no es válido'),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/me/notifications?cursor=sin-fecha"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.after).not.toHaveBeenCalled();
  });
});
