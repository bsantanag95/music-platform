import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { AlbumFacts, AlbumIdentity, CommunityStats } from "./AlbumHeader";
import type { AlbumCommunityStats } from "@/services/catalog/album-community-shared";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const album = catalogEs.album;

describe("AlbumIdentity", () => {
  it("muestra el tipo de obra como antetítulo, también para un álbum de estudio", () => {
    renderWithIntl(<AlbumIdentity title="Meddle" category="studio" artists={[]} />);
    expect(screen.getByText(album.workType.studio)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Meddle" })).toBeInTheDocument();
  });

  it("muestra una recopilación sin alterar el título", () => {
    renderWithIntl(<AlbumIdentity title="Echoes" category="compilation" artists={[]} />);
    expect(screen.getByText(album.workType.compilation)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Echoes" })).toBeInTheDocument();
  });

  it("enlaza todos los artistas de un álbum colaborativo con su joinPhrase", () => {
    renderWithIntl(
      <AlbumIdentity
        title="Colaboración"
        category="studio"
        artists={[
          { id: "a1", name: "Artista A", joinPhrase: " & " },
          { id: "a2", name: "Artista B", joinPhrase: null },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Artista A" })).toHaveAttribute("href", "/artist/a1");
    expect(screen.getByRole("link", { name: "Artista B" })).toHaveAttribute("href", "/artist/a2");
    expect(screen.getByText("Artista A").parentElement).toHaveTextContent("Artista A & Artista B");
  });
});

describe("AlbumFacts", () => {
  const base = {
    releaseGroupId: "rg-1",
    tracks: [{ durationSec: 60 }, { durationSec: 120 }],
    editionLabel: "standard",
    editionsAvailable: false,
  };

  it("muestra lanzamiento con fecha completa, duración y edición", () => {
    renderWithIntl(<AlbumFacts {...base} firstReleaseDate="1973-03-24" firstReleaseYear={1973} />);
    expect(screen.getAllByText("24 de marzo de 1973").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 pistas · 3:00").length).toBeGreaterThan(0);
    expect(screen.getAllByText(album.facts.editionStandard).length).toBeGreaterThan(0);
  });

  it("con precisión anual muestra solo el año", () => {
    renderWithIntl(<AlbumFacts {...base} firstReleaseDate={null} firstReleaseYear={1971} />);
    expect(screen.getAllByText("1971").length).toBeGreaterThan(0);
  });

  it("omite la fila Lanzamiento sin fecha y no deja guiones", () => {
    renderWithIntl(<AlbumFacts {...base} firstReleaseDate={null} firstReleaseYear={null} />);
    expect(screen.queryByText(album.facts.release)).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText(album.facts.label)).not.toBeInTheDocument();
  });

  it("marca la duración como mínima si falta alguna pista", () => {
    renderWithIntl(
      <AlbumFacts {...base} tracks={[{ durationSec: 100 }, { durationSec: null }]} firstReleaseDate={null} firstReleaseYear={null} />,
    );
    expect(screen.getAllByText(/2 pistas · ≥ 1:40/).length).toBeGreaterThan(0);
  });
});

function makeStats(overrides: Partial<AlbumCommunityStats> = {}): AlbumCommunityStats {
  return {
    ratings: {
      count: 1204,
      averageStars: 4.6,
      averageDetailedScore: 89.2,
      histogram: [0, 0, 1, 2, 3, 5, 8, 20, 40, 30],
    },
    reviewCount: 38,
    collectors: { kind: "exact", value: 212 },
    seekers: { kind: "exact", value: 97 },
    listCount: 64,
    ...overrides,
  };
}

describe("CommunityStats", () => {
  it("muestra media, detallada, conteos, listas e histograma sobre el umbral", () => {
    renderWithIntl(<CommunityStats stats={makeStats()} listsHref="/album/rg-1/lists" />);
    expect(screen.getByText("★ 4,6")).toBeInTheDocument();
    expect(screen.getByText("89/100")).toBeInTheDocument();
    expect(screen.getByText("38 reseñas")).toBeInTheDocument();
    expect(screen.getByText("212")).toBeInTheDocument();
    expect(screen.getByText("97 lo buscan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: album.community.seeLists })).toHaveAttribute("href", "/album/rg-1/lists");
    expect(screen.getByRole("img", { name: /Distribución de valoraciones/ })).toBeInTheDocument();
  });

  it("por debajo del umbral muestra el conteo sin media ni histograma, y 'menos de 5'", () => {
    renderWithIntl(
      <CommunityStats
        stats={makeStats({
          ratings: { count: 4, averageStars: null, averageDetailedScore: null, histogram: null },
          collectors: { kind: "fewer", threshold: 5 },
          seekers: { kind: "exact", value: 0 },
          listCount: 0,
        })}
        listsHref="/album/rg-1/lists"
      />,
    );
    expect(screen.getByText(album.community.fewRatings)).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Menos de 5")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: album.community.seeLists })).not.toBeInTheDocument();
  });
});
