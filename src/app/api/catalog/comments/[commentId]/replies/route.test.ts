import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  listReplies: vi.fn(),
  createReply: vi.fn(),
  requireUser: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  requireSocialActivityAllowed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/social", () => ({ listReplies: mocks.listReplies, createReply: mocks.createReply }));
vi.mock("@/services/auth/authorization", () => ({
  requireUser: mocks.requireUser,
  getCurrentUser: mocks.getCurrentUser,
  requireSocialActivityAllowed: mocks.requireSocialActivityAllowed,
}));

const ID = "00000000-0000-4000-8000-000000000010";
const params = { params: Promise.resolve({ commentId: ID }) };
const url = `http://localhost/api/catalog/comments/${ID}/replies`;

describe("GET respuestas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el hilo con la paginación validada y sin sesión", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.listReplies.mockResolvedValue({ comments: [], page: 2, pageSize: 10, hasNext: false });

    const response = await GET(new NextRequest(`${url}?page=2&pageSize=10`), params);

    expect(response.status).toBe(200);
    expect(mocks.listReplies).toHaveBeenCalledWith(ID, 2, 10, null);
  });

  it("pasa el id de quien mira para likedByMe", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer" });
    mocks.listReplies.mockResolvedValue({ comments: [], page: 1, pageSize: 20, hasNext: false });
    await GET(new NextRequest(url), params);
    expect(mocks.listReplies).toHaveBeenCalledWith(ID, 1, 20, "viewer");
  });

  it.each([["page", "0"], ["page", "NaN"], ["pageSize", "101"]])("rechaza %s=%s con VALIDATION_ERROR", async (name, value) => {
    const response = await GET(new NextRequest(`${url}?${name}=${value}`), params);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listReplies).not.toHaveBeenCalled();
  });

  it("rechaza un id que no es UUID con INVALID_COMMENT", async () => {
    const response = await GET(new NextRequest(url), { params: Promise.resolve({ commentId: "no-uuid" }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_COMMENT" });
  });
});

describe("POST respuestas", () => {
  beforeEach(() => vi.clearAllMocks());

  const post = (body: unknown) => POST(new NextRequest(url, { method: "POST", body: JSON.stringify(body) }), params);

  it("crea la respuesta y devuelve 201 con comment", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
    mocks.createReply.mockResolvedValue({ id: "reply-id", parentId: ID });

    const response = await post({ body: "Texto" });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ comment: { id: "reply-id", parentId: ID } });
    expect(mocks.createReply).toHaveBeenCalledWith(ID, "user-id", "Texto");
    expect(mocks.requireSocialActivityAllowed).toHaveBeenCalledWith("user-id");
  });

  it("exige sesión y no llega al servicio sin ella", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await post({ body: "Texto" });
    expect(response.status).toBe(401);
    expect(mocks.createReply).not.toHaveBeenCalled();
  });

  it("una suspensión social impide responder", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
    mocks.requireSocialActivityAllowed.mockRejectedValueOnce(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    const response = await post({ body: "Texto" });
    expect(response.status).toBe(403);
    expect(mocks.createReply).not.toHaveBeenCalled();
  });

  it.each([[{}], [{ body: "" }], [{ body: "x".repeat(5001) }]])("rechaza un cuerpo inválido (%j) con INVALID_COMMENT", async (payload) => {
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
    const response = await post(payload);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_COMMENT" });
    expect(mocks.createReply).not.toHaveBeenCalled();
  });
});
