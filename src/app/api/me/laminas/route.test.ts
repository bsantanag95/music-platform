// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const ID = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  allowed: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  add: vi.fn(),
  addMany: vi.fn(),
  reorder: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.user, requireSocialActivityAllowed: mocks.allowed }));
vi.mock("@/services/laminas/laminas", () => ({
  listMyLaminas: mocks.list,
  createLamina: mocks.create,
  updateLamina: mocks.update,
  getOwnedLamina: vi.fn(),
  deleteLamina: vi.fn(),
  addLaminaItem: mocks.add,
  addLaminaItems: mocks.addMany,
  reorderLamina: mocks.reorder,
}));

import { PATCH } from "./[id]/route";
import { POST as addItem, PUT as reorder } from "./[id]/items/route";
import { POST } from "./route";

const req = (method: string, body: unknown) =>
  new NextRequest("http://localhost/api/me/laminas", { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const context = { params: Promise.resolve({ id: ID }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "u1" });
  mocks.allowed.mockResolvedValue(undefined);
  mocks.create.mockResolvedValue({ id: ID });
  mocks.update.mockResolvedValue({ id: ID });
  mocks.add.mockResolvedValue({ id: ID });
  mocks.addMany.mockResolvedValue({ id: ID });
  mocks.reorder.mockResolvedValue({ id: ID });
});

describe("/api/me/laminas", () => {
  it("crea con formato y tipo", async () => {
    const res = await POST(req("POST", { title: "Mis discos", format: "top5", entityType: "release-group" }));
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith("u1", expect.objectContaining({ format: "top5" }));
  });

  it.each([
    ["sin título", { title: " ", format: "top5", entityType: "release-group" }],
    ["formato desconocido", { title: "x", format: "top3", entityType: "release-group" }],
    ["artistas", { title: "x", format: "top5", entityType: "artist" }],
  ])("rechaza %s", async (_label, body) => {
    expect((await POST(req("POST", body))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("ampliar la audiencia respeta la suspensión", async () => {
    mocks.allowed.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    expect((await PATCH(req("PATCH", { audience: "public" }), context)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("cerrarla no la necesita", async () => {
    mocks.allowed.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    expect((await PATCH(req("PATCH", { audience: "private" }), context)).status).toBe(200);
  });

  it("un PATCH vacío se rechaza", async () => {
    expect((await PATCH(req("PATCH", {}), context)).status).toBe(400);
  });

  it("agrega y reordena por id", async () => {
    await addItem(req("POST", { targetId: ID }), context);
    expect(mocks.add).toHaveBeenCalledWith(ID, "u1", ID);
    await reorder(req("PUT", { itemIds: [ID] }), context);
    expect(mocks.reorder).toHaveBeenCalledWith(ID, "u1", [ID]);
  });

  it("un alta desde una fuente no pide la comprobación social: nace privada", async () => {
    mocks.allowed.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    const res = await POST(req("POST", { title: "Mis discos", format: "top5", entityType: "release-group", targetIds: [ID] }));
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith("u1", expect.objectContaining({ targetIds: [ID] }));
  });

  it("agrega un lote", async () => {
    await addItem(req("POST", { targetIds: [ID] }), context);
    expect(mocks.addMany).toHaveBeenCalledWith(ID, "u1", [ID]);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("un lote vacío o de más de 10 se rechaza", async () => {
    expect((await addItem(req("POST", { targetIds: [] }), context)).status).toBe(400);
    expect((await addItem(req("POST", { targetIds: Array(11).fill(ID) }), context)).status).toBe(400);
  });

  it("un id inválido responde 404", async () => {
    const res = await addItem(req("POST", { targetId: ID }), { params: Promise.resolve({ id: "x" }) });
    expect(res.status).toBe(404);
  });
});
