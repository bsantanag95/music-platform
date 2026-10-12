import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReleaseGroupRow } from "@/db/schema";

const mocks = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => Promise.resolve(mocks.rows) }) }),
  },
}));
vi.mock("@/services/catalog/cover", () => ({ findOrResolveCover: vi.fn() }));
vi.mock("@/lib/config/cover-mirror", () => ({ NEGATIVE_RETRY_MS: 7 * 24 * 60 * 60 * 1000 }));

import { createCoverResolver } from "./covers";

function row(id: string, over: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return { id, mbid: id, coverThumbUrl: null, coverCheckedAt: null, coverBlockedAt: null, ...over } as ReleaseGroupRow;
}

beforeEach(() => {
  mocks.rows = [];
});

describe("createCoverResolver", () => {
  it("acepta los que ya tienen carátula sin gastar presupuesto", async () => {
    mocks.rows = [row("a", { coverThumbUrl: "u" }), row("b", { coverThumbUrl: "u" })];
    const find = vi.fn();
    const resolver = createCoverResolver(5, find);

    await expect(resolver.take(["a", "b"], 5)).resolves.toEqual(["a", "b"]);
    expect(find).not.toHaveBeenCalled();
    expect(resolver.spent).toBe(0);
  });

  it("resuelve los pendientes en el orden recibido y descarta los que CAA no confirma", async () => {
    mocks.rows = [row("a"), row("b"), row("c")];
    const find = vi.fn(async (r: ReleaseGroupRow) => (r.id === "b" ? null : "https://cover"));
    const resolver = createCoverResolver(5, find);

    await expect(resolver.take(["a", "b", "c"], 5)).resolves.toEqual(["a", "c"]);
    expect(resolver.spent).toBe(3);
  });

  it("se detiene al reunir el límite", async () => {
    mocks.rows = [row("a", { coverThumbUrl: "u" }), row("b", { coverThumbUrl: "u" }), row("c", { coverThumbUrl: "u" })];
    const resolver = createCoverResolver(5, vi.fn());

    await expect(resolver.take(["a", "b", "c"], 2)).resolves.toEqual(["a", "b"]);
  });

  it("respeta el presupuesto y avisa que se agotó", async () => {
    mocks.rows = [row("a"), row("b"), row("c")];
    const find = vi.fn(async () => "https://cover");
    const resolver = createCoverResolver(2, find);

    await expect(resolver.take(["a", "b", "c"], 5)).resolves.toEqual(["a", "b"]);
    expect(find).toHaveBeenCalledTimes(2);
    expect(resolver.exhausted).toBe(true);
  });

  it("descarta las retiradas y las ausencias confirmadas recientemente sin gastar presupuesto", async () => {
    mocks.rows = [
      row("blocked", { coverBlockedAt: new Date() }),
      row("negative", { coverCheckedAt: new Date() }),
      row("ok", { coverThumbUrl: "u" }),
    ];
    const find = vi.fn();
    const resolver = createCoverResolver(5, find);

    await expect(resolver.take(["blocked", "negative", "ok"], 5)).resolves.toEqual(["ok"]);
    expect(find).not.toHaveBeenCalled();
  });

  it("descarta ids que no existen y los repetidos", async () => {
    mocks.rows = [row("a", { coverThumbUrl: "u" })];
    const resolver = createCoverResolver(5, vi.fn());

    await expect(resolver.take(["fantasma", "a", "a"], 5)).resolves.toEqual(["a"]);
  });

  it("no vuelve a pedir un disco ya resuelto aunque otra consulta lo proponga de nuevo", async () => {
    mocks.rows = [row("a"), row("b")];
    const find = vi.fn(async () => "https://cover");
    const resolver = createCoverResolver(5, find);

    await resolver.take(["a", "b"], 5);
    await resolver.take(["a", "b"], 5);
    await expect(resolver.first(["a"])).resolves.toBe("a");

    expect(find).toHaveBeenCalledTimes(2);
    expect(resolver.spent).toBe(2);
  });

  it("recuerda también los descartes", async () => {
    mocks.rows = [row("a")];
    const find = vi.fn(async () => null);
    const resolver = createCoverResolver(5, find);

    await resolver.take(["a"], 5);
    await resolver.take(["a"], 5);

    expect(find).toHaveBeenCalledTimes(1);
  });

  it("first devuelve el primero con carátula o null", async () => {
    mocks.rows = [row("a", { coverBlockedAt: new Date() }), row("b", { coverThumbUrl: "u" })];
    const resolver = createCoverResolver(5, vi.fn());

    await expect(resolver.first(["a", "b"])).resolves.toBe("b");
    await expect(resolver.first(["a"])).resolves.toBeNull();
  });
});
