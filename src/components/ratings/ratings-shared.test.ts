import { describe, expect, it } from "vitest";
import type { MyRatingEntry, RatingsResponse } from "@/lib/api/schemas";
import {
  applyRatingsResponse,
  displayForGroup,
  groupRatingsByArtist,
  groupRatingsByType,
  ownForDialog,
  ratingArtistHref,
  ratingHref,
  sectionTitleKey,
  typeLabelKey,
} from "./ratings-shared";

function uuid(n: number) {
  return `550e8400-e29b-41d4-a716-4466554400${String(n).padStart(2, "0")}`;
}

function entry(n: number, targetType: MyRatingEntry["targetType"], overrides: Partial<MyRatingEntry> = {}): MyRatingEntry {
  return {
    id: uuid(n),
    targetType,
    stars: 4,
    detailedScore: 78,
    updatedAt: "2026-10-01T10:00:00.000Z",
    target: {
      id: uuid(n + 50),
      title: `Título ${n}`,
      coverThumbUrl: null,
      artistName: "Heart",
      artistId: uuid(90),
      year: 1987,
    },
    ...overrides,
  };
}

describe("groupRatingsByType", () => {
  it("parte la lista en Álbumes → Canciones conservando el orden dentro de cada tipo", () => {
    const groups = groupRatingsByType([
      entry(1, "release-group"),
      entry(2, "release-group"),
      entry(3, "recording"),
    ]);
    expect(groups.map((group) => group.type)).toEqual(["release-group", "recording"]);
    expect(groups[0]!.entries.map((item) => item.id)).toEqual([uuid(1), uuid(2)]);
    expect(groups[1]!.entries.map((item) => item.id)).toEqual([uuid(3)]);
  });

  it("omite las secciones vacías", () => {
    const groups = groupRatingsByType([entry(3, "recording")]);
    expect(groups.map((group) => group.type)).toEqual(["recording"]);
    expect(groupRatingsByType([])).toEqual([]);
  });

  it("no hay sección de artistas", () => {
    const types = groupRatingsByType([entry(1, "release-group"), entry(2, "recording")]).map((group) => group.type);
    expect(types).not.toContain("artist" as never);
  });
});

function byArtist(entry: MyRatingEntry, artistId: string | null, artistName: string | null): MyRatingEntry {
  return { ...entry, target: { ...entry.target, artistId, artistName } };
}

describe("groupRatingsByArtist", () => {
  const heart = uuid(91);
  const aimee = uuid(92);

  it("reúne cada artista en una sección y separa Álbumes de Canciones", () => {
    const groups = groupRatingsByArtist([
      byArtist(entry(1, "release-group"), aimee, "Aimee Mann"),
      byArtist(entry(2, "release-group"), heart, "Heart"),
      byArtist(entry(3, "release-group"), heart, "Heart"),
      byArtist(entry(4, "recording"), heart, "Heart"),
    ]);
    expect(groups.map((group) => group.artistName)).toEqual(["Aimee Mann", "Heart"]);
    expect(groups[0]!.byType.map((sub) => sub.type)).toEqual(["release-group"]);
    expect(groups[1]!.byType.map((sub) => [sub.type, sub.entries.length])).toEqual([
      ["release-group", 2],
      ["recording", 1],
    ]);
  });

  it("omite el subgrupo vacío", () => {
    const groups = groupRatingsByArtist([byArtist(entry(4, "recording"), heart, "Heart")]);
    expect(groups[0]!.byType.map((sub) => sub.type)).toEqual(["recording"]);
  });

  it("agrupa por id aunque dos artistas se llamen igual", () => {
    const groups = groupRatingsByArtist([
      byArtist(entry(1, "release-group"), heart, "Heart"),
      byArtist(entry(2, "release-group"), aimee, "Heart"),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("no supone contigüidad: un artista que reaparece se suma a su sección", () => {
    const groups = groupRatingsByArtist([
      byArtist(entry(1, "release-group"), heart, "Heart"),
      byArtist(entry(2, "release-group"), aimee, "Aimee Mann"),
      byArtist(entry(3, "release-group"), heart, "Heart"),
    ]);
    expect(groups.map((group) => group.artistName)).toEqual(["Heart", "Aimee Mann"]);
    expect(groups[0]!.byType[0]!.entries).toHaveLength(2);
  });

  it("las valoraciones sin artista van a una sección propia, al final y sin enlace", () => {
    const groups = groupRatingsByArtist([
      byArtist(entry(1, "recording"), null, null),
      byArtist(entry(2, "release-group"), heart, "Heart"),
    ]);
    expect(groups.map((group) => group.key)).toEqual([heart, "none"]);
    expect(groups[1]!.href).toBeNull();
    expect(groups[1]!.artistName).toBeNull();
  });

  it("el encabezado enlaza a la página del artista", () => {
    const [group] = groupRatingsByArtist([byArtist(entry(1, "release-group"), heart, "Heart")]);
    expect(group!.href).toMatch(/^\/artist\//);
  });

  it("sin entradas no hay secciones", () => {
    expect(groupRatingsByArtist([])).toEqual([]);
  });
});

describe("displayForGroup", () => {
  it("bajo 'Por artista' omite artista y tipo", () => {
    expect(displayForGroup("artist")).toEqual({ showArtist: false, showType: false });
  });

  it("bajo 'Por tipo' omite solo el tipo", () => {
    expect(displayForGroup("type")).toEqual({ showArtist: true, showType: false });
  });

  it("sin agrupar muestra ambos", () => {
    expect(displayForGroup("none")).toEqual({ showArtist: true, showType: true });
  });
});

describe("enlaces y claves", () => {
  it("enlaza álbum y canción a su página", () => {
    expect(ratingHref(entry(1, "release-group"))).toMatch(/^\/album\//);
    expect(ratingHref(entry(2, "recording"))).toMatch(/^\/song\//);
  });

  it("el enlace al artista es null cuando no se conoce", () => {
    expect(ratingArtistHref(entry(1, "release-group"))).toMatch(/^\/artist\//);
    const base = entry(1, "release-group");
    const sinArtista = entry(1, "release-group", {
      target: { ...base.target, artistName: null, artistId: null },
    });
    expect(ratingArtistHref(sinArtista)).toBeNull();
  });

  it("resuelve las claves de tipo y de sección", () => {
    expect(typeLabelKey("release-group")).toBe("typeAlbum");
    expect(typeLabelKey("recording")).toBe("typeSong");
    expect(sectionTitleKey("release-group")).toBe("sectionAlbums");
    expect(sectionTitleKey("recording")).toBe("sectionSongs");
  });
});

describe("applyRatingsResponse / ownForDialog", () => {
  it("aplica estrellas, puntaje y fecha de la respuesta", () => {
    const own = {
      id: uuid(1),
      stars: 5,
      detailedScore: 96,
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    };
    const next = applyRatingsResponse(entry(1, "release-group"), { own } as RatingsResponse);
    expect(next).toMatchObject({ stars: 5, detailedScore: 96, updatedAt: "2026-10-02T10:00:00.000Z" });
  });

  it("devuelve null cuando la nota se borró", () => {
    expect(applyRatingsResponse(entry(1, "release-group"), { own: null } as unknown as RatingsResponse)).toBeNull();
  });

  it("arma la valoración propia para el diálogo", () => {
    const own = ownForDialog(entry(1, "release-group", { stars: 3.5, detailedScore: null }));
    expect(own).toMatchObject({ id: uuid(1), stars: 3.5, detailedScore: null });
  });
});
