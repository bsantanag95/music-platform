import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  replacePinned: vi.fn(),
  getShowcase: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/showcase", () => ({
  replacePinned: mocks.replacePinned,
  getShowcase: mocks.getShowcase,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const albumId = "00000000-0000-4000-8000-0000000000a1";

function put(body: unknown) {
  return new NextRequest("http://localhost/api/me/profile/pinned", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.getShowcase.mockResolvedValue({ pinned: [], anthem: null });
});

describe("PUT /api/me/profile/pinned", () => {
  it("reemplaza el conjunto y devuelve el showcase", async () => {
    const res = await PUT(
      put({ items: [{ type: "release-group", id: albumId, note: "puerta de entrada" }] }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ showcase: { pinned: [], anthem: null } });
    expect(mocks.replacePinned).toHaveBeenCalledWith(user.id, [
      { type: "release-group", id: albumId, note: "puerta de entrada" },
    ]);
  });

  it("rechaza un quinto destacado con VALIDATION_ERROR", async () => {
    const items = Array.from({ length: 5 }, () => ({ type: "artist", id: albumId }));
    const res = await PUT(put({ items }));
    expect(res.status).toBe(400);
    expect(mocks.replacePinned).not.toHaveBeenCalled();
  });

  it("DELETE vacía los destacados", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mocks.replacePinned).toHaveBeenCalledWith(user.id, []);
  });
});
