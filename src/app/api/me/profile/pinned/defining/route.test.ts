import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  setDefiningEntity: vi.fn(),
  clearDefiningEntity: vi.fn(),
  getShowcase: vi.fn(),
  refreshProfileTone: vi.fn(),
  after: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after,
}));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/showcase", () => ({
  setDefiningEntity: mocks.setDefiningEntity,
  clearDefiningEntity: mocks.clearDefiningEntity,
  getShowcase: mocks.getShowcase,
}));
vi.mock("@/services/profiles/tone", () => ({ refreshProfileTone: mocks.refreshProfileTone }));

import { DELETE, PUT } from "./route";

const user = { id: "00000000-0000-4000-8000-000000000001" };
const id = "00000000-0000-4000-8000-0000000000a1";

const request = (method: "PUT" | "DELETE", body: unknown) =>
  new NextRequest("http://localhost/api/me/profile/pinned/defining", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.getShowcase.mockResolvedValue({ pinned: [], identityCard: { artist: null, album: null, anthem: null } });
});

describe("/api/me/profile/pinned/defining — tono del perfil", () => {
  it("elegir el álbum definitorio agenda el recálculo del tono después de responder", async () => {
    const res = await PUT(request("PUT", { type: "release-group", id }));
    expect(res.status).toBe(200);
    expect(mocks.setDefiningEntity).toHaveBeenCalledWith(user.id, "release-group", id);
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.refreshProfileTone).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0]![0]();
    expect(mocks.refreshProfileTone).toHaveBeenCalledWith(user.id);
  });

  it("un fallo del recálculo no rompe nada", async () => {
    mocks.refreshProfileTone.mockRejectedValueOnce(new Error("red"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await PUT(request("PUT", { type: "release-group", id }));
    await expect(mocks.after.mock.calls[0]![0]()).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("elegir el artista definitorio no toca el tono", async () => {
    await PUT(request("PUT", { type: "artist", id }));
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("quitar el álbum no agenda cálculo (lo borra clearDefiningEntity)", async () => {
    const res = await DELETE(request("DELETE", { type: "release-group", id }));
    expect(res.status).toBe(200);
    expect(mocks.clearDefiningEntity).toHaveBeenCalledWith(user.id, "release-group");
    expect(mocks.after).not.toHaveBeenCalled();
  });
});
