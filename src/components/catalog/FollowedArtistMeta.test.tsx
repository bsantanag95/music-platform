import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FollowedArtistMeta } from "./FollowedArtistMeta";
import { FollowedArtistReleasesRail, railReleases } from "./FollowedArtistReleasesRail";
import type { FollowedArtistDto } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const DAY = 24 * 60 * 60 * 1000;
const day = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
const release = (title: string, date: string | null, year: number | null, releaseGroupId: string | null = null) => ({
  title,
  date,
  year,
  releaseGroupId,
});

const europe: FollowedArtistDto = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  name: "Europe",
  type: "group",
  photoUrl: null,
  country: "SE",
  followedAt: "2026-09-15T12:00:00.000Z",
  news: null,
  latestRelease: release("Walk the Earth", "2017-10-20", 2017, "a1b2c3d4-0000-4000-8000-0000000000aa"),
};

describe("FollowedArtistMeta (redesign-artists-rows, D1–D2)", () => {
  it("muestra país, tipo, último disco enlazado y desde cuándo lo sigue", () => {
    renderWithIntl(<FollowedArtistMeta artist={europe} />);
    const line = screen.getByText(/Suecia/).closest("p")!;
    expect(line).toHaveTextContent("Suecia · Grupo · Último: Walk the Earth (2017) · Lo sigues desde sept 2026");
    expect(screen.getByRole("link", { name: "Walk the Earth" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/album\/europe-walk-the-earth-/),
    );
  });

  it("una novedad que sale dice «Sale el …» y no repite el mismo disco como último", () => {
    renderWithIntl(
      <FollowedArtistMeta
        artist={{ ...europe, news: release("Nuevo disco", day(10), 2026), latestRelease: release("Nuevo disco", null, 2026) }}
      />,
    );
    expect(screen.getByText(/^Sale el/)).toBeInTheDocument();
    expect(screen.queryByText(/Último:/)).not.toBeInTheDocument();
  });

  it("una novedad que ya salió dice «Salió hace …»", () => {
    renderWithIntl(<FollowedArtistMeta artist={{ ...europe, news: release("En vivo", day(-5), 2026) }} />);
    expect(screen.getByText(/^Salió hace/)).toBeInTheDocument();
  });

  it("un tipo que no se nombra no aparece", () => {
    renderWithIntl(<FollowedArtistMeta artist={{ ...europe, type: "other", country: null }} />);
    expect(screen.queryByText(/Grupo/)).not.toBeInTheDocument();
  });
});

describe("riel de próximos lanzamientos (D5)", () => {
  const withNews = (id: string, date: string): FollowedArtistDto => ({
    ...europe,
    id: `a1b2c3d4-0000-4000-8000-00000000000${id}`,
    name: `Artista ${id}`,
    news: release(`Disco ${id}`, date, 2026),
  });

  it("primero lo que sale (la más cercana) y luego lo reciente (la más nueva), hasta seis", () => {
    const today = day(0);
    const list = [
      withNews("1", day(-10)),
      withNews("2", day(20)),
      withNews("3", day(5)),
      withNews("4", day(-2)),
      europe,
    ];
    expect(railReleases(list, today).map((a) => a.name)).toEqual(["Artista 3", "Artista 2", "Artista 4", "Artista 1"]);
  });

  it("sin novedades no se renderiza", () => {
    const { container } = renderWithIntl(<FollowedArtistReleasesRail artists={[europe]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lista título, artista y fecha", () => {
    renderWithIntl(<FollowedArtistReleasesRail artists={[withNews("1", day(7))]} />);
    expect(screen.getByRole("heading", { name: "Próximos lanzamientos", hidden: true })).toBeInTheDocument();
    expect(screen.getByText("Disco 1")).toBeInTheDocument();
    expect(screen.getByText("Artista 1")).toBeInTheDocument();
  });
});
