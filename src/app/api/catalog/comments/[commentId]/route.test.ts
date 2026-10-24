import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
  updateComment: vi.fn(),
  getRootComment: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser, getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/services/social", () => ({ updateComment: mocks.updateComment, getRootComment: mocks.getRootComment }));

describe("GET comentario raíz", () => {
  const ID = "00000000-0000-4000-8000-000000000001";

  it("devuelve la raíz con likedByMe del visitante con sesión", async () => {
    const root = { id: ID, body: "Tema" };
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer" });
    mocks.getRootComment.mockResolvedValue(root);

    const response = await GET(new NextRequest("http://localhost"), { params: Promise.resolve({ commentId: ID }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ comment: root });
    expect(mocks.getRootComment).toHaveBeenCalledWith(ID, "viewer");
  });

  it("sin sesión también responde (lectura pública)", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getRootComment.mockResolvedValue({ id: ID });

    const response = await GET(new NextRequest("http://localhost"), { params: Promise.resolve({ commentId: ID }) });

    expect(response.status).toBe(200);
    expect(mocks.getRootComment).toHaveBeenCalledWith(ID, null);
  });

  it("un id que no es UUID es INVALID_COMMENT", async () => {
    const response = await GET(new NextRequest("http://localhost"), { params: Promise.resolve({ commentId: "x" }) });

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_COMMENT");
  });
});

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
