import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  listComments: vi.fn(),
  createComment: vi.fn(),
  resolveSocialTarget: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/social", () => mocks);
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

describe("GET comentarios", () => {
  it.each([
    ["page", "NaN"],
    ["page", "0"],
    ["pageSize", "0"],
    ["pageSize", "101"],
  ])("rechaza %s=%s con VALIDATION_ERROR", async (parameter, value) => {
    const request = new NextRequest(`http://localhost/api/catalog/artist/00000000-0000-4000-8000-000000000001/comments?${parameter}=${value}`);
    const response = await GET(request, { params: Promise.resolve({ target: "artist", id: "00000000-0000-4000-8000-000000000001" }) });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listComments).not.toHaveBeenCalled();
  });

  it("pasa la paginación validada sin normalizarla", async () => {
    mocks.resolveSocialTarget.mockResolvedValue({ type: "artist", id: "id", column: "artistId" });
    mocks.listComments.mockResolvedValue({ comments: [], page: 2, pageSize: 10, hasNext: false });
    const request = new NextRequest("http://localhost/api/catalog/artist/00000000-0000-4000-8000-000000000001/comments?page=2&pageSize=10");

    expect((await GET(request, { params: Promise.resolve({ target: "artist", id: "00000000-0000-4000-8000-000000000001" }) })).status).toBe(200);
    expect(mocks.listComments).toHaveBeenCalledWith(expect.anything(), 2, 10);
  });

  it("POST devuelve el comentario dentro de comment", async () => {
    const created = { id: "comment-id", body: "Texto", user: { id: "user-id" } };
    mocks.resolveSocialTarget.mockResolvedValue({ type: "artist", id: "id", column: "artistId" });
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
    mocks.createComment.mockResolvedValue(created);

    const response = await POST(
      new NextRequest("http://localhost", { method: "POST", body: JSON.stringify({ body: "Texto" }) }),
      { params: Promise.resolve({ target: "artist", id: "00000000-0000-4000-8000-000000000001" }) },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ comment: created });
  });
});
