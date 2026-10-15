import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeGroups } from "./groups";
import { resolveContext, type PresenterRegistry } from "./resolve";
import { emptyContext, type CollectionContext, type CollectionPresenter, type PresenterInput } from "./types";

const today = new Date("2026-10-14T12:00:00Z");
const input = (over: Partial<PresenterInput> = {}): PresenterInput => ({
  templateKey: "t",
  periodKey: "evergreen",
  family: "releases",
  albumIds: ["a", "b", "c"],
  today,
  ...over,
});

const context = (summaryKey: string): CollectionContext => ({
  summary: { key: summaryKey },
  notes: new Map(),
  numbered: false,
});

function registry(over: Partial<PresenterRegistry> = {}): PresenterRegistry {
  const family = (key: string): CollectionPresenter => async () => context(key);
  return {
    byTemplate: {},
    byFamily: {
      ephemeris: family("family:ephemeris"),
      awards: family("family:awards"),
      releases: family("family:releases"),
      discovery: family("family:discovery"),
      rankings: family("family:rankings"),
    },
    ...over,
  };
}

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));

describe("normalizeGroups", () => {
  it("descarta ids ajenos y repetidos y conserva el orden de la lista dentro de cada grupo", () => {
    const groups = normalizeGroups(["a", "b", "c", "d"], [
      { label: { key: "x" }, albumIds: ["c", "zzz", "a", "a"] },
      { label: { key: "y" }, albumIds: ["b", "a"] },
    ]);

    expect(groups).toEqual([
      { label: { key: "x" }, albumIds: ["a", "c"] },
      { label: { key: "y" }, albumIds: ["b"] },
      { albumIds: ["d"] },
    ]);
  });

  it("los discos sin grupo van a un último grupo sin encabezado y ninguno se pierde", () => {
    const groups = normalizeGroups(["a", "b", "c", "d"], [{ label: { key: "x" }, albumIds: ["a", "b"] }]);

    expect(groups.flatMap((group) => group.albumIds).sort()).toEqual(["a", "b", "c", "d"]);
    expect(groups.at(-1)).toEqual({ albumIds: ["c", "d"] });
    expect(groups.at(-1)!.label).toBeUndefined();
  });

  it("un grupo que queda vacío no se conserva y sin grupos todo cae a un grupo sin encabezado", () => {
    expect(normalizeGroups(["a"], [{ label: { key: "x" }, albumIds: ["zzz"] }])).toEqual([{ albumIds: ["a"] }]);
    expect(normalizeGroups(["a", "b"], [])).toEqual([{ albumIds: ["a", "b"] }]);
  });
});

describe("resolveContext", () => {
  it("usa el presentador de la plantilla en lugar del de la familia", async () => {
    const result = await resolveContext(registry({ byTemplate: { t: async () => context("template") } }), input());
    expect(result.summary?.key).toBe("template");
  });

  it("una plantilla sin presentador usa el de su familia", async () => {
    const result = await resolveContext(registry(), input({ templateKey: "otra", family: "ephemeris" }));
    expect(result.summary?.key).toBe("family:ephemeris");
  });

  it("una plantilla retirada del registro (o una colección sin plantilla) se presenta con su familia", async () => {
    expect((await resolveContext(registry(), input({ templateKey: "ya-no-existe", family: "awards" }))).summary?.key).toBe("family:awards");
    expect((await resolveContext(registry(), input({ templateKey: null, family: "rankings" }))).summary?.key).toBe("family:rankings");
  });

  it("un presentador que se abstiene deja pasar a la familia", async () => {
    const result = await resolveContext(registry({ byTemplate: { t: async () => null } }), input());
    expect(result.summary?.key).toBe("family:releases");
  });

  it("un presentador que falla no tumba el detalle: cae a la familia", async () => {
    const boom: CollectionPresenter = async () => {
      throw new Error("la base no responde");
    };
    const result = await resolveContext(registry({ byTemplate: { t: boom } }), input());
    expect(result.summary?.key).toBe("family:releases");
    expect(console.error).toHaveBeenCalled();
  });

  it("si la familia también se abstiene devuelve un contexto vacío", async () => {
    const none: CollectionPresenter = async () => null;
    const byFamily = { ...registry().byFamily, releases: none };
    const result = await resolveContext(registry({ byFamily }), input());

    expect(result).toEqual(emptyContext());
    expect(result.summary).toBeUndefined();
    expect(result.numbered).toBe(false);
  });

  it("fuerza a partición los grupos que devuelve un presentador", async () => {
    const grouped: CollectionPresenter = async () => ({
      notes: new Map(),
      numbered: false,
      groups: [{ label: { key: "m" }, albumIds: ["b", "zzz"] }],
    });
    const result = await resolveContext(registry({ byTemplate: { t: grouped } }), input());

    expect(result.groups).toEqual([{ label: { key: "m" }, albumIds: ["b"] }, { albumIds: ["a", "c"] }]);
  });

  it("sin grupos no inventa ninguno", async () => {
    expect((await resolveContext(registry(), input())).groups).toBeUndefined();
  });
});
