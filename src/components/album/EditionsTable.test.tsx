import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { EditionsTable, describeFormats, formatFamily, type EditionRow } from "./EditionsTable";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const editionsEs = catalogEs.album.editions;

function row(id: string, overrides: Partial<EditionRow> = {}): EditionRow {
  return {
    id,
    mbid: `${id}-mbid`,
    title: "Álbum",
    status: "Official",
    year: 1973,
    releaseDate: null,
    country: "GB",
    formats: ['12" Vinyl'],
    trackCount: 10,
    labels: [{ name: "Harvest", catalogNumber: "SHVL 804" }],
    variant: null,
    ...overrides,
  };
}

const EDITIONS = [
  row("original"),
  row("cd", { year: 1984, country: "JP", formats: ["CD"], labels: [{ name: "Toshiba EMI", catalogNumber: "CP35" }] }),
  row("experience", {
    year: 2011,
    formats: ["CD", "CD"],
    trackCount: 19,
    variant: { editionId: "experience", extraTracks: 9 },
  }),
  row("bootleg", { status: "Bootleg", year: 1990, formats: ["Cassette"] }),
];

function renderTable() {
  renderWithIntl(<EditionsTable releaseGroupId="rg-1" editions={EDITIONS} representativeMbid="original-mbid" />);
}

describe("formatFamily y describeFormats", () => {
  it("agrupa formatos de MusicBrainz en familias", () => {
    expect(formatFamily('12" Vinyl')).toBe("vinyl");
    expect(formatFamily("Hybrid SACD (CD layer)")).toBe("cd");
    expect(formatFamily("Digital Media")).toBe("digital");
    expect(formatFamily("Cassette")).toBe("cassette");
    expect(formatFamily("DVD-Video")).toBe("other");
  });

  it("compacta formatos repetidos", () => {
    expect(describeFormats(["CD", "CD", "DVD"])).toBe("2×CD + DVD");
  });
});

describe("EditionsTable", () => {
  it("muestra solo las oficiales por defecto, marca la mostrada y enlaza a MusicBrainz", () => {
    renderTable();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText(`· ${editionsEs.shown}`)).toBeInTheDocument();
    expect(within(rows[0]!).getByRole("link", { name: "Ver Álbum en MusicBrainz" })).toHaveAttribute(
      "href",
      "https://musicbrainz.org/release/original-mbid",
    );
    expect(screen.getByText("4 ediciones · 3 oficiales")).toBeInTheDocument();
  });

  it("incluye las no oficiales al activar el control", () => {
    renderTable();
    fireEvent.click(screen.getByLabelText(editionsEs.includeUnofficial));
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(4);
    expect(screen.getByText("· bootleg")).toBeInTheDocument();
  });

  it("filtra por formato", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: editionsEs.families.cd }));
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(screen.queryByText("SHVL 804", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: editionsEs.families.cd })).toHaveAttribute("aria-pressed", "true");
  });

  it("lleva las ediciones con pistas adicionales a su sección en Canciones", () => {
    renderTable();
    expect(screen.getByRole("link", { name: "+9 pistas" })).toHaveAttribute("href", "/album/rg-1#variant-experience");
  });

  it("muestra el estado vacío cuando el filtro no deja ediciones", () => {
    renderWithIntl(
      <EditionsTable releaseGroupId="rg-1" editions={[row("a", { status: "Bootleg" }), row("b", { status: "Bootleg" })]} representativeMbid={null} />,
    );
    expect(screen.getByText(editionsEs.empty)).toBeInTheDocument();
  });
});
