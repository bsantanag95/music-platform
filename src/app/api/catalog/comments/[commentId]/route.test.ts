import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  updateComment: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/social", () => ({ updateComment: mocks.updateComment }));

describe("PATCH comentarios", () => {
  it("devuelve el comentario dentro de comment", async () => {
    const updated = { id: "00000000-0000-4000-8000-000000000001", body: "Editado" };
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
    mocks.updateComment.mockResolvedValue(updated);

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ body: "Editado" }) }),
      { params: Promise.resolve({ commentId: "00000000-0000-4000-8000-000000000001" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ comment: updated });
  });
});
