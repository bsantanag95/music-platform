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
  kind: vi.fn(),
  createTier: vi.fn(),
  updateTier: vi.fn(),
  arrange: vi.fn(),
  removeTier: vi.fn(),
  removeTop: vi.fn(),
  addTier: vi.fn(),
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
  ownedLaminaKind: mocks.kind,
  removeLaminaItem: mocks.removeTop,
}));
vi.mock("@/services/laminas/tiers", () => ({
  createTierList: mocks.createTier,
  updateTierList: mocks.updateTier,
  getOwnedTierList: vi.fn(),
  arrangeTierList: mocks.arrange,
  removeTierListItem: mocks.removeTier,
  addTierListItem: mocks.addTier,
}));

import { PATCH } from "./[id]/route";
import { POST as addItem, PUT as reorder } from "./[id]/items/route";
import { DELETE as removeItem } from "./[id]/items/[itemId]/route";
import { PUT as arrange } from "./[id]/tiers/route";
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
  mocks.kind.mockResolvedValue("top");
  mocks.createTier.mockResolvedValue({ id: ID });
  mocks.updateTier.mockResolvedValue({ id: ID });
  mocks.arrange.mockResolvedValue({ id: ID });
  mocks.removeTier.mockResolvedValue({ id: ID });
  mocks.removeTop.mockResolvedValue({ id: ID });
  mocks.addTier.mockResolvedValue({ id: ID });
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

describe("tier list", () => {
  const tierBody = { kind: "tier", title: "Metallica", entityType: "release-group", source: { type: "discography", artistId: ID } };

  it("crea desde una discografía sin pedir la comprobación social: nace privada", async () => {
    mocks.allowed.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    const res = await POST(req("POST", tierBody));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ tierList: { id: ID } });
    expect(mocks.createTier).toHaveBeenCalledWith("u1", expect.objectContaining({ source: { type: "discography", artistId: ID } }));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([
    ["de artistas", { ...tierBody, entityType: "artist" }],
    ["con una fuente desconocida", { ...tierBody, source: { type: "genre", slug: "rock" } }],
    ["con más de 50 elegidos", { ...tierBody, source: { type: "picked", targetIds: Array(51).fill(ID) } }],
    ["sin elegidos", { ...tierBody, source: { type: "picked", targetIds: [] } }],
    ["sin fuente", { ...tierBody, source: undefined }],
    ["con un artista inválido", { ...tierBody, source: { type: "discography", artistId: "x" } }],
  ])("rechaza una %s", async (_label, body) => {
    expect((await POST(req("POST", body))).status).toBe(400);
    expect(mocks.createTier).not.toHaveBeenCalled();
  });

  it("el PATCH de una tier list acepta etiquetas y no el formato", async () => {
    mocks.kind.mockResolvedValue("tier");
    const labels = ["Dios", "A", "B", "C", "D", "E"];
    expect((await PATCH(req("PATCH", { tierLabels: labels }), context)).status).toBe(200);
    expect(mocks.updateTier).toHaveBeenCalledWith(ID, "u1", { tierLabels: labels });
    expect((await PATCH(req("PATCH", { tierLabels: ["S", "", "B", "C", "D", "E"] }), context)).status).toBe(400);
    expect((await PATCH(req("PATCH", { tierLabels: ["S", "A"] }), context)).status).toBe(400);
    expect((await PATCH(req("PATCH", { tierLabels: ["S", "A", "B", "C", "D", "Trece letras!"] }), context)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("ampliar la audiencia de una tier list respeta la suspensión", async () => {
    mocks.kind.mockResolvedValue("tier");
    mocks.allowed.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    expect((await PATCH(req("PATCH", { audience: "public" }), context)).status).toBe(403);
    expect(mocks.updateTier).not.toHaveBeenCalled();
  });

  it("guarda la disposición con seis niveles", async () => {
    const tiers = [[ID], [], [], [], [], []];
    expect((await arrange(req("PUT", { tiers, tray: [] }), context)).status).toBe(200);
    expect(mocks.arrange).toHaveBeenCalledWith(ID, "u1", { tiers, tray: [] });
    expect((await arrange(req("PUT", { tiers: [[ID]], tray: [] }), context)).status).toBe(400);
    expect((await arrange(req("PUT", { tiers, tray: [] }), { params: Promise.resolve({ id: "x" }) })).status).toBe(404);
  });

  it("quitar un disco despacha por tipo", async () => {
    mocks.kind.mockResolvedValue("tier");
    const res = await removeItem(req("DELETE", null), { params: Promise.resolve({ id: ID, itemId: ID }) });
    expect(await res.json()).toEqual({ tierList: { id: ID } });
    expect(mocks.removeTop).not.toHaveBeenCalled();
  });

  it("crea de canciones desde un disco y desde lo elegido", async () => {
    const album = { ...tierBody, entityType: "recording", source: { type: "album", releaseGroupId: ID } };
    expect((await POST(req("POST", album))).status).toBe(201);
    expect(mocks.createTier).toHaveBeenLastCalledWith("u1", expect.objectContaining({ entityType: "recording", source: { type: "album", releaseGroupId: ID } }));
    const picked = { ...tierBody, source: { type: "picked", targetIds: [ID] } };
    expect((await POST(req("POST", picked))).status).toBe(201);
    expect(mocks.createTier).toHaveBeenLastCalledWith("u1", expect.objectContaining({ source: { type: "picked", targetIds: [ID] } }));
  });

  it("agrega a mano de a un ítem, por tipo", async () => {
    mocks.kind.mockResolvedValue("tier");
    const res = await addItem(req("POST", { targetId: ID }), context);
    expect(await res.json()).toEqual({ tierList: { id: ID } });
    expect(mocks.addTier).toHaveBeenCalledWith(ID, "u1", ID);
    expect(mocks.add).not.toHaveBeenCalled();
    expect((await addItem(req("POST", { targetIds: [ID] }), context)).status).toBe(400);
    expect(mocks.addMany).not.toHaveBeenCalled();
  });

  it("crea desde otra tier list; copiar etiquetas es opcional y nace apagado", async () => {
    const body = { ...tierBody, source: { type: "lamina", id: ID } };
    expect((await POST(req("POST", body))).status).toBe(201);
    expect(mocks.createTier).toHaveBeenLastCalledWith("u1", expect.objectContaining({ source: { type: "lamina", id: ID, copyLabels: false } }));
    expect((await POST(req("POST", { ...tierBody, source: { type: "lamina", id: ID, copyLabels: true } }))).status).toBe(201);
    expect(mocks.createTier).toHaveBeenLastCalledWith("u1", expect.objectContaining({ source: { type: "lamina", id: ID, copyLabels: true } }));
    expect((await POST(req("POST", { ...tierBody, source: { type: "lamina", id: "x" } }))).status).toBe(400);
  });
});
