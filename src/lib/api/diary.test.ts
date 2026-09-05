import { describe, expect, it, vi, beforeEach } from "vitest";
import { createListenEntry, deleteListenEntry, getMyDiary, updateListenEntry } from "./diary";

const entryId = "a1b2c3d4-0000-4000-8000-000000000001";
const targetId = "a1b2c3d4-0000-4000-8000-000000000002";
const entry = {
  id: entryId,
  listenContext: "first_listen",
  body: null,
  reaction: null,
  audience: "followers",
  createdAt: "2026-01-01",
  target: { type: "artist", id: targetId, title: "Pink Floyd", subtitle: null, coverThumbUrl: null },
};

describe("cliente API del diario", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("parsea los wrappers reales de los endpoints del diario", async () => {
    const fetchMock = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ entries: [], page: 1, pageSize: 20, hasNext: false }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ entry }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ entry: { ...entry, reaction: "loved", body: "Genial" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(getMyDiary()).resolves.toMatchObject({ page: 1, entries: [] });
    await expect(createListenEntry({ type: "artist", id: targetId })).resolves.toMatchObject({ audience: "followers" });
    await expect(updateListenEntry(entryId, { reaction: "loved", body: "Genial" })).resolves.toMatchObject({ reaction: "loved" });
    await expect(deleteListenEntry(entryId)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("getMyDiary arma el query string con los filtros presentes, omitiendo los ausentes", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ entries: [], page: 1, pageSize: 20, hasNext: false }), { status: 200 }));

    await getMyDiary(1, 20, { q: "radiohead", reaction: "none" });

    const url = new URL(fetchMock.mock.calls[0]![0] as string, "http://localhost");
    expect(url.searchParams.get("q")).toBe("radiohead");
    expect(url.searchParams.get("reaction")).toBe("none");
    expect(url.searchParams.has("context")).toBe(false);
    expect(url.searchParams.has("audience")).toBe(false);
  });

  it("rechaza una reacción fuera de la taxonomía al parsear", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ entry: { ...entry, reaction: "sarcasmo" } }), { status: 200 }),
    );
    await expect(createListenEntry({ type: "artist", id: targetId })).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
  });
});