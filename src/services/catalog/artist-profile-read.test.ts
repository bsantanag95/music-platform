import { describe, expect, it, vi } from "vitest";
import type { ArtistLocalizedTextRow, ArtistRow } from "@/db/schema";

vi.mock("@/db", () => ({ db: {} }));
const { buildArtistProfile } = await import("./artist-profile-read");

function row(overrides: Partial<ArtistRow> = {}): ArtistRow {
  return {
    id: "a1",
    mbid: "m1",
    type: "group",
    name: "Kuervos del Sur",
    disambiguation: "Chilean fusion band",
    photoUrl: "https://thumb.wikimedia.org/k.jpg",
    createdAt: new Date(),
    discographySyncedAt: null,
    discographyCompleteAt: null,
    membershipsSyncedAt: null,
    lineupSyncedAt: null,
    country: "CL",
    beginAreaName: "Curicó",
    endAreaName: null,
    lifeBegin: "2003",
    lifeEnd: null,
    lifeEnded: false,
    wikidataId: "Q63565567",
    profileSyncedAt: new Date(),
    wikimediaSyncedAt: new Date(),
    photoFile: "Kuervos del Sur.jpg",
    photoAuthor: "Carolina Marlene Gatica Molina",
    photoLicense: "CC BY-SA 4.0",
    photoLicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    photoSourceUrl: "https://commons.wikimedia.org/wiki/File:Kuervos_del_Sur.jpg",
    photoBlockedAt: null,
    ...overrides,
  };
}

function text(locale: "es" | "en", overrides: Partial<ArtistLocalizedTextRow> = {}): ArtistLocalizedTextRow {
  return {
    id: `t-${locale}`,
    artistId: "a1",
    locale,
    description: null,
    summary: null,
    summaryTitle: null,
    summaryUrl: null,
    placeLabel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const ES = text("es", {
  description: "Grupo de música de Chile",
  summary: "Kuervos del Sur es una banda chilena de rock…",
  summaryTitle: "Kuervos del Sur",
  summaryUrl: "https://es.wikipedia.org/wiki/Kuervos_del_Sur",
  placeLabel: "Curicó, Chile",
});

describe("buildArtistProfile", () => {
  it("en el idioma pedido: descripción, resumen, lugar, enlaces y foto con crédito", () => {
    const profile = buildArtistProfile(row(), [{ kind: "bandcamp", url: "https://k.bandcamp.com/" }], [ES], "es");
    expect(profile).toMatchObject({
      description: "Grupo de música de Chile",
      summary: { language: "es", url: "https://es.wikipedia.org/wiki/Kuervos_del_Sur" },
      placeLabel: "Curicó, Chile",
      links: [{ kind: "bandcamp", url: "https://k.bandcamp.com/" }],
      photo: { license: "CC BY-SA 4.0", author: "Carolina Marlene Gatica Molina" },
      facts: { country: "CL", lifeBegin: "2003", lifeEnded: false },
    });
  });

  it("sin artículo en inglés, la lectura en inglés usa el resumen en español e informa su idioma", () => {
    const profile = buildArtistProfile(row(), [], [ES, text("en", { description: "Chilean musical group" })], "en");
    expect(profile.summary).toMatchObject({ language: "es", title: "Kuervos del Sur" });
    expect(profile.description).toBe("Chilean musical group");
  });

  it("la descripción no usa la de otro idioma", () => {
    expect(buildArtistProfile(row(), [], [ES], "en").description).toBeNull();
  });

  it("sin lugar de Wikidata, el respaldo es el lugar de inicio de MusicBrainz", () => {
    expect(buildArtistProfile(row({ beginAreaName: "Concepción" }), [], [], "es").placeLabel).toBe("Concepción");
  });

  it("una foto retirada no se entrega aunque quede algún dato", () => {
    expect(buildArtistProfile(row({ photoBlockedAt: new Date() }), [], [], "es").photo).toBeNull();
  });

  it("no expone la desambiguación de MusicBrainz", () => {
    expect(JSON.stringify(buildArtistProfile(row(), [], [ES], "es"))).not.toContain("Chilean fusion band");
  });
});
