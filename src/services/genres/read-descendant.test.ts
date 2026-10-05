import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ selectRows: [] as unknown[], executeRows: [] as unknown[] }));

vi.mock("@/db", () => {
  const select = () => ({
    from: () => ({ where: () => ({ limit: async () => mocks.selectRows }) }),
  });
  return { db: { select, execute: async () => mocks.executeRows } };
});

const { albumHasGenre, albumInGenreTreeOnce, findDescendantStyleGenre } = await import("./read");

const GENRE = { id: "g-child", slug: "neo-prog", name: "neo-prog", nameEs: null, kind: "style" };

beforeEach(() => {
  mocks.selectRows = [GENRE];
  mocks.executeRows = [{ ok: 1 }];
});

describe("findDescendantStyleGenre", () => {
  it("devuelve el género si cuelga de la raíz", async () => {
    await expect(findDescendantStyleGenre("g-root", "neo-prog")).resolves.toMatchObject({ slug: "neo-prog" });
  });

  it("devuelve null si no cuelga de la raíz", async () => {
    mocks.executeRows = [];
    await expect(findDescendantStyleGenre("g-root", "neo-prog")).resolves.toBeNull();
  });

  it("devuelve null si el slug no existe o tiene formato inválido", async () => {
    mocks.selectRows = [];
    await expect(findDescendantStyleGenre("g-root", "no-existe")).resolves.toBeNull();
    await expect(findDescendantStyleGenre("g-root", "NO VÁLIDO!")).resolves.toBeNull();
  });

  it("la propia raíz no es un descendiente", async () => {
    await expect(findDescendantStyleGenre("g-child", "neo-prog")).resolves.toBeNull();
  });
});

describe("albumHasGenre", () => {
  it("es una condición correlacionada con el literal de release_group y sin recursión", () => {
    const rendered = JSON.stringify(albumHasGenre("g-1"));
    expect(rendered).toContain('\\"release_group\\".\\"id\\"');
    expect(rendered).not.toContain("RECURSIVE");
  });
});

describe("albumInGenreTreeOnce", () => {
  it("materializa el subárbol una vez y se correlaciona con el literal de release_group", () => {
    const rendered = JSON.stringify(albumInGenreTreeOnce("g-1"));
    expect(rendered).toContain("MATERIALIZED");
    expect(rendered).toContain('\\"release_group\\".\\"id\\"');
  });
});
