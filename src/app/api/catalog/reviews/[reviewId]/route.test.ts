import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/reviews", () => ({
  updateReview: mocks.updateReview,
  deleteReview: mocks.deleteReview,
}));

const ID = "00000000-0000-4000-8000-000000000001";
const params = { params: Promise.resolve({ reviewId: ID }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "user-id" });
});

describe("PATCH reseña", () => {
  it("devuelve la reseña dentro de review", async () => {
    const updated = { id: ID, title: "T", body: "Editado", rating: null };
    mocks.updateReview.mockResolvedValue(updated);
    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ body: "Editado" }) }),
      params,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ review: updated });
  });

  it("rechaza un id no-UUID con REVIEW_NOT_FOUND", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ body: "x" }) }),
      { params: Promise.resolve({ reviewId: "no-uuid" }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "REVIEW_NOT_FOUND" });
  });

  it("rechaza un PATCH sin ningún campo", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({}) }),
      params,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.updateReview).not.toHaveBeenCalled();
  });
});

describe("DELETE reseña", () => {
  it("responde 204 sin cuerpo", async () => {
    mocks.deleteReview.mockResolvedValue(undefined);
    const response = await DELETE(new NextRequest("http://localhost", { method: "DELETE" }), params);
    expect(response.status).toBe(204);
    expect(mocks.deleteReview).toHaveBeenCalledWith(ID, "user-id");
  });
});
