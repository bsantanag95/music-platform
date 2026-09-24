import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

const { buildDiscographyStrip, orderDiscography } = await import("./album-neighbors");

function album(id: string, date: string | null, year: number | null, title = id) {
  return { id, title, coverThumbUrl: null, firstReleaseDate: date, firstReleaseYear: year };
}

describe("orderDiscography", () => {
  it("ordena por fecha completa, luego por año, y deja al final los álbumes sin fecha", () => {
    const ordered = orderDiscography([
      album("sin-fecha", null, null),
      album("wish", "1975-09-12", 1975),
      album("meddle", null, 1971),
      album("dsotm", "1973-03-24", 1973),
    ]);
    expect(ordered.map((a) => a.id)).toEqual(["meddle", "dsotm", "wish", "sin-fecha"]);
  });

  it("desempata por título", () => {
    const ordered = orderDiscography([album("b", null, 1970, "Zeta"), album("a", null, 1970, "Alfa")]);
    expect(ordered.map((a) => a.id)).toEqual(["a", "b"]);
  });
});

describe("buildDiscographyStrip", () => {
  const albums = [
    album("meddle", "1971-10-30", 1971),
    album("dsotm", "1973-03-24", 1973),
    album("wish", "1975-09-12", 1975),
  ];

  it("ubica el álbum actual con anterior y siguiente", () => {
    const strip = buildDiscographyStrip(albums, "dsotm");
    expect(strip?.currentIndex).toBe(1);
    expect(strip?.previous?.id).toBe("meddle");
    expect(strip?.next?.id).toBe("wish");
  });

  it("el primer álbum no tiene anterior", () => {
    const strip = buildDiscographyStrip(albums, "meddle");
    expect(strip?.previous).toBeNull();
    expect(strip?.next?.id).toBe("dsotm");
  });

  it("no hay franja con un solo álbum o si el actual no está", () => {
    expect(buildDiscographyStrip([albums[0]!], "meddle")).toBeNull();
    expect(buildDiscographyStrip(albums, "otro")).toBeNull();
  });
});
