import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import type { AlbumPersonnel, PersonnelEntry } from "@/services/catalog/personnel-levels";
import { AlbumOnThisRecord, PRODUCTION_MAX, onThisRecordData } from "./AlbumOnThisRecord";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const t = catalogEs.album.onThisRecord;
const entry = (id: string, name: string, level: PersonnelEntry["level"], relationType: string, attributes: string[] = []): PersonnelEntry => ({
  artistId: id,
  name,
  creditedAs: null,
  level,
  roles: [{ relationType, attributes }],
  tracks: "all",
});
const personnel = (levels: Partial<AlbumPersonnel["levels"]>): AlbumPersonnel => ({
  levels: { members: [], guests: [], production: [], other: [], ...levels },
  leadKind: "group",
  songwriters: [],
  byTrack: { albumWide: { songwriting: [], production: [], performers: [], sound: [], other: [] }, tracks: {} },
  releaseMbid: null,
});
const edition = (mbid: string, formats: string[], status: string | null = "Official") => ({ mbid, status, formats });

describe("onThisRecordData", () => {
  it("productores primero y como mucho 4 en producción", () => {
    const data = onThisRecordData(
      personnel({
        production: [
          entry("e1", "Ingeniero 1", "production", "engineer"),
          entry("p1", "Martin Birch", "production", "producer"),
          entry("e2", "Ingeniero 2", "production", "mix"),
          entry("e3", "Ingeniero 3", "production", "engineer"),
          entry("e4", "Ingeniero 4", "production", "engineer"),
        ],
      }),
      { editions: [], representativeMbid: null },
    )!;
    expect(data.production.map((p) => p.name)).toEqual(["Martin Birch", "Ingeniero 1", "Ingeniero 2", "Ingeniero 3"]);
    expect(data.production).toHaveLength(PRODUCTION_MAX);
  });

  it("ediciones por familia solo con más de una edición; sin datos, nada", () => {
    const data = onThisRecordData(null, {
      editions: [edition("a", ["CD"]), edition("b", ['12" Vinyl']), edition("c", ["CD"]), edition("d", ["Cassette"], "Bootleg")],
      representativeMbid: "a",
    })!;
    expect(data.editions).toEqual({ total: 4, families: [{ family: "cd", count: 2 }, { family: "vinyl", count: 1 }] });
    expect(onThisRecordData(null, { editions: [edition("a", ["CD"])], representativeMbid: "a" })).toBeNull();
    expect(onThisRecordData(personnel({}), { editions: [], representativeMbid: null })).toBeNull();
  });
});

describe("AlbumOnThisRecord", () => {
  it("formación con roles traducidos, producción con su enlace y ediciones con el total", () => {
    const data = onThisRecordData(
      personnel({
        members: [entry("bd", "Bruce Dickinson", "members", "vocal", ["lead vocals"])],
        production: [entry("mb", "Martin Birch", "production", "producer")],
      }),
      { editions: [edition("a", ["CD"]), edition("b", ['12" Vinyl'])], representativeMbid: "a" },
    )!;
    renderWithIntl(<AlbumOnThisRecord data={data} creditsHref="/album/x/credits" editionsHref="/album/x/editions" />);
    expect(screen.getByRole("complementary", { name: t.heading })).toBeInTheDocument();
    expect(screen.getByText(t.lineup)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bruce Dickinson" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${t.allCredits} →` })).toHaveAttribute("href", "/album/x/credits");
    expect(screen.getByRole("link", { name: "Ver las 2 ediciones →" })).toHaveAttribute("href", "/album/x/editions");
    expect(screen.getByText("CD")).toBeInTheDocument();
  });
});
