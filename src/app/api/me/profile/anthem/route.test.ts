import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  setAnthem: vi.fn(),
  clearAnthem: vi.fn(),
  getShowcase: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/showcase", () => ({
  setAnthem: mocks.setAnthem,
  clearAnthem: mocks.clearAnthem,
  getShowcase: mocks.getShowcase,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const recId = "00000000-0000-4000-8000-0000000000c1";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.getShowcase.mockResolvedValue({ pinned: [], anthem: null });
});

describe("/api/me/profile/anthem", () => {
  it("PUT fija el himno", async () => {
    const res = await PUT(
      new NextRequest("http://localhost/api/me/profile/anthem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId: recId }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.setAnthem).toHaveBeenCalledWith(user.id, recId);
  });

  it("PUT rechaza un recordingId inválido", async () => {
    const res = await PUT(
      new NextRequest("http://localhost/api/me/profile/anthem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId: "no-es-uuid" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mocks.setAnthem).not.toHaveBeenCalled();
  });

  it("DELETE quita el himno", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mocks.clearAnthem).toHaveBeenCalledWith(user.id);
  });
});
