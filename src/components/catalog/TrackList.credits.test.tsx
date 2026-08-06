import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { TrackList } from "./TrackList";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import type { AlbumTrack } from "@/services/catalog/album-detail";

function makeTrack(
  discNumber: number,
  position: number,
  title: string,
  credits: AlbumTrack["credits"] = [],
): AlbumTrack {
  return {
    recordingId: `rec-${discNumber}-${position}`,
    discNumber,
    position,
    title,
    durationSec: 120,
    credits,
  };
}

const discLabelEs = (n: number) => catalogEs.album.discLabel.replace("{number}", String(n));

describe("TrackList créditos", () => {
  it("muestra créditos destacados como texto sin enlaces", () => {
    const tracks = [
      makeTrack(1, 1, "Breathe", [
        { artistId: "a1", name: "Pink Floyd", role: "primary", joinPhrase: null },
        { artistId: "a2", name: "Roger Waters", role: "featured", joinPhrase: " feat. " },
      ]),
    ];

    renderWithIntl(
      <TrackList
        tracks={tracks}
        tracklistHeading={catalogEs.album.tracklistHeading}
        discLabel={discLabelEs}
        durationLabel={catalogEs.album.durationLabel}
        durationUnknown={catalogEs.album.durationUnknown}
        creditsLabel={catalogEs.album.creditsLabel}
      />,
    );

    expect(screen.getByText(/Roger Waters/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("no muestra etiqueta de créditos cuando no hay créditos destacados", () => {
    const tracks = [
      makeTrack(1, 1, "Track sin créditos", [
        { artistId: "a1", name: "Pink Floyd", role: "primary", joinPhrase: null },
      ]),
    ];

    renderWithIntl(
      <TrackList
        tracks={tracks}
        tracklistHeading={catalogEs.album.tracklistHeading}
        discLabel={discLabelEs}
        durationLabel={catalogEs.album.durationLabel}
        durationUnknown={catalogEs.album.durationUnknown}
        creditsLabel={catalogEs.album.creditsLabel}
      />,
    );

    expect(screen.queryByText(catalogEs.album.creditsLabel)).not.toBeInTheDocument();
  });

  it("muestra múltiples créditos destacados separados por comas", () => {
    const tracks = [
      makeTrack(1, 1, "Colaboración", [
        { artistId: "a1", name: "Artist A", role: "primary", joinPhrase: null },
        { artistId: "a2", name: "Artist B", role: "featured", joinPhrase: " feat. " },
        { artistId: "a3", name: "Artist C", role: "featured", joinPhrase: " & " },
      ]),
    ];

    renderWithIntl(
      <TrackList
        tracks={tracks}
        tracklistHeading={catalogEs.album.tracklistHeading}
        discLabel={discLabelEs}
        durationLabel={catalogEs.album.durationLabel}
        durationUnknown={catalogEs.album.durationUnknown}
        creditsLabel={catalogEs.album.creditsLabel}
      />,
    );

    expect(screen.getByText(/Artist B/)).toBeInTheDocument();
    expect(screen.getByText(/Artist C/)).toBeInTheDocument();
  });
});
