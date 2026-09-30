import { beforeEach, describe, expect, it, vi } from "vitest";

const redirects: string[] = [];
vi.mock("next/navigation", () => ({
  permanentRedirect: (url: string) => {
    redirects.push(url);
  },
}));

const { resolveCatalogRoute } = await import("./catalog-route");

beforeEach(() => {
  redirects.length = 0;
});

describe("resolveCatalogRoute", () => {
  it("no redirige cuando el segmento ya es el canónico", () => {
    resolveCatalogRoute({
      locale: "es",
      kind: "artist",
      segment: "pink-floyd-KGbai8kbv81qoNbTiNhQ7m",
      canonical: "pink-floyd-KGbai8kbv81qoNbTiNhQ7m",
    });
    expect(redirects).toEqual([]);
  });

  it("redirige el UUID hexadecimal del formato anterior", () => {
    resolveCatalogRoute({
      locale: "es",
      kind: "artist",
      segment: "93f1f6be-b1dc-42d0-abde-2850072d0774",
      canonical: "pink-floyd-KGbai8kbv81qoNbTiNhQ7m",
    });
    expect(redirects).toEqual(["/es/artist/pink-floyd-KGbai8kbv81qoNbTiNhQ7m"]);
  });

  it("conserva la subruta de pestaña y todo el query", () => {
    resolveCatalogRoute({
      locale: "es",
      kind: "album",
      segment: "kqhie2dgrb4crpkj3vxdd8",
      canonical: "pink-floyd-the-wall-KQHie2Dgrb4CRpKj3vXDD8",
      subpath: "/credits",
      searchParams: { view: "songs" },
    });
    expect(redirects).toEqual([
      "/es/album/pink-floyd-the-wall-KQHie2Dgrb4CRpKj3vXDD8/credits?view=songs",
    ]);
  });

  it("conserva varios valores de un mismo parámetro", () => {
    resolveCatalogRoute({
      locale: "en",
      kind: "song",
      segment: "x",
      canonical: "кино-да-a1b2",
      searchParams: { tag: ["a", "b"] },
    });
    expect(redirects).toEqual(["/en/song/" + encodeURIComponent("кино-да-a1b2") + "?tag=a&tag=b"]);
  });

  it("no produce bucle con un nombre Unicode percent-encoded", () => {
    // Next puede entregar el parámetro percent-encoded: se compara ya decodificado y NFC.
    const canonical = "кино-KGbai8kbv81qoNbTiNhQ7m";
    resolveCatalogRoute({
      locale: "es",
      kind: "artist",
      segment: encodeURIComponent(canonical),
      canonical,
    });
    expect(redirects).toEqual([]);
  });

  it("canonicaliza un slug viejo con nombre Unicode y deja el destino en ASCII (percent-encoded)", () => {
    resolveCatalogRoute({
      locale: "es",
      kind: "artist",
      segment: encodeURIComponent("kino-viejo-KGbai8kbv81qoNbTiNhQ7m"),
      canonical: "кино-KGbai8kbv81qoNbTiNhQ7m",
    });
    expect(redirects).toEqual(["/es/artist/" + encodeURIComponent("кино-KGbai8kbv81qoNbTiNhQ7m")]);
  });

  it("canonicaliza una lista conservando el usuario dueño", () => {
    resolveCatalogRoute({
      locale: "es",
      kind: "list",
      owner: "ana",
      segment: "b2c3d4e50000400080000000000def",
      canonical: "mis-favoritos-b2c3d4e5-0000-4000-8000-000000000def",
    });
    expect(redirects).toEqual([
      "/es/users/ana/lists/mis-favoritos-b2c3d4e5-0000-4000-8000-000000000def",
    ]);
  });
});
