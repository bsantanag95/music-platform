import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { TrackList } from "./TrackList";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import catalogEn from "../../../messages/en/catalog.json";
import type { AlbumTrack } from "@/services/catalog/album-detail";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function makeTrack(
  discNumber: number,
  position: number,
  title: string,
  durationSec: number | null,
  credits: AlbumTrack["credits"] = [],
): AlbumTrack {
  return {
    recordingId: `rec-${discNumber}-${position}`,
    discNumber,
    position,
    title,
    durationSec,
    credits,
  };
}

const discLabelEs = (n: number) => catalogEs.album.discLabel.replace("{number}", String(n));
const discLabelEn = (n: number) => catalogEn.album.discLabel.replace("{number}", String(n));

describe("TrackList", () => {
  it("renderiza un tracklist de un solo disco con posición, título y duración", () => {
    const tracks = [
      makeTrack(1, 1, "Breathe", 170),
      makeTrack(1, 2, "On the Run", 226),
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

    expect(screen.getByRole("heading", { name: catalogEs.album.tracklistHeading })).toBeInTheDocument();
    expect(screen.getByText("Breathe")).toBeInTheDocument();
    expect(screen.getByText("On the Run")).toBeInTheDocument();
    expect(screen.getByText("2:50")).toBeInTheDocument();
    expect(screen.getByText("3:46")).toBeInTheDocument();
  });

  it("agrupa visualmente los tracks por disco cuando hay más de uno", () => {
    const tracks = [
      makeTrack(1, 1, "Track A1", 120),
      makeTrack(1, 2, "Track A2", 180),
      makeTrack(2, 1, "Track B1", 200),
      makeTrack(2, 2, "Track B2", 240),
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

    expect(screen.getByRole("heading", { name: discLabelEs(1) })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: discLabelEs(2) })).toBeInTheDocument();
    expect(screen.getByText("Track A1")).toBeInTheDocument();
    expect(screen.getByText("Track B2")).toBeInTheDocument();
  });

  it("no muestra encabezados de disco cuando hay un solo disco", () => {
    const tracks = [makeTrack(1, 1, "Solo Track", 60)];

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

    expect(screen.queryByRole("heading", { name: discLabelEs(1) })).not.toBeInTheDocument();
  });

  it("muestra la etiqueta localizada cuando la duración es nula", () => {
    const tracks = [makeTrack(1, 1, "Sin duración", null)];

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

    expect(screen.getByText(catalogEs.album.durationUnknown)).toBeInTheDocument();
  });

  it("usa las etiquetas del locale activo", () => {
    const tracks = [makeTrack(1, 1, "Track", null)];

    renderWithIntl(
      <TrackList
        tracks={tracks}
        tracklistHeading={catalogEn.album.tracklistHeading}
        discLabel={discLabelEn}
        durationLabel={catalogEn.album.durationLabel}
        durationUnknown={catalogEn.album.durationUnknown}
        creditsLabel={catalogEn.album.creditsLabel}
      />,
      "en",
    );

    expect(screen.getByText(catalogEn.album.durationUnknown)).toBeInTheDocument();
    expect(screen.queryByText(catalogEs.album.durationUnknown)).not.toBeInTheDocument();
  });
});
