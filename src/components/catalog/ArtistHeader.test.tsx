import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { ArtistHeader } from "./ArtistHeader";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import catalogEn from "../../../messages/en/catalog.json";
import type { ArtistRow } from "@/db/schema";

function makeArtist(overrides: Partial<ArtistRow> = {}): ArtistRow {
  return {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    mbid: null,
    type: "group",
    name: "Pink Floyd",
    disambiguation: null,
    photoUrl: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    discographySyncedAt: null,
    discographyCompleteAt: null,
    membershipsSyncedAt: null,
    country: null,
    beginAreaName: null,
    endAreaName: null,
    lifeBegin: null,
    lifeEnd: null,
    lifeEnded: null,
    wikidataId: null,
    profileSyncedAt: null,
    wikimediaSyncedAt: null,
    photoFile: null,
    photoAuthor: null,
    photoLicense: null,
    photoLicenseUrl: null,
    photoSourceUrl: null,
    photoBlockedAt: null,
    ...overrides,
  };
}

describe("ArtistHeader", () => {
  it("muestra nombre y tipo traducido, pero no la desambiguación de MusicBrainz", () => {
    const artist = makeArtist({
      disambiguation: "UK rock band",
      photoUrl: "https://example.com/photo.jpg",
    });

    renderWithIntl(
      <ArtistHeader
        artist={artist}
        typeLabel={catalogEs.artist.typeLabels.group}
        noPhotoAlt={catalogEs.artist.noPhotoAlt}
      />,
    );

    expect(screen.getByRole("heading", { name: "Pink Floyd" })).toBeInTheDocument();
    expect(screen.getByText(catalogEs.artist.typeLabels.group)).toBeInTheDocument();
    expect(screen.queryByText("UK rock band")).not.toBeInTheDocument();
  });

  it("muestra el placeholder cuando no hay foto", () => {
    const artist = makeArtist({ photoUrl: null });

    renderWithIntl(
      <ArtistHeader
        artist={artist}
        typeLabel={catalogEs.artist.typeLabels.group}
        noPhotoAlt={catalogEs.artist.noPhotoAlt}
      />,
    );

    expect(screen.getByRole("img", { name: catalogEs.artist.noPhotoAlt })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Pink Floyd" })).not.toBeInTheDocument();
  });

  it("traduce el tipo según el locale", () => {
    const artist = makeArtist({ type: "person" });

    renderWithIntl(
      <ArtistHeader
        artist={artist}
        typeLabel={catalogEn.artist.typeLabels.person}
        noPhotoAlt={catalogEn.artist.noPhotoAlt}
      />,
      "en",
    );

    expect(screen.getByText(catalogEn.artist.typeLabels.person)).toBeInTheDocument();
    expect(screen.queryByText(catalogEs.artist.typeLabels.person)).not.toBeInTheDocument();
  });
});
