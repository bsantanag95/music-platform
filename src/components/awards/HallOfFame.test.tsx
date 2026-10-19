import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { CeremonyPage, HallOfFameClass, NominationView } from "@/services/awards/read";
import { HallOfFameClassView } from "./HallOfFameClassView";
import { HallOfFameExploreSection } from "./HallOfFameExploreSection";
import { HallOfFameTile } from "./HallOfFameTile";

// jsdom no implementa ResizeObserver ni matchMedia (el riel desplazable los usa para las flechas y el movimiento).
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
}));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode; scroll?: boolean }) => {
    const attrs: Record<string, unknown> = { ...rest };
    delete attrs.scroll;
    return (
      <a href={href} {...attrs}>
        {children}
      </a>
    );
  },
}));
vi.mock("@/components/catalog/LazyCoverImage", () => ({ LazyCoverImage: () => <div data-testid="lazy-cover" /> }));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <div data-testid="cover" /> }));

const cover = (id: string) => ({ releaseGroupId: id, coverThumbUrl: null, coverResolved: true });

const album = (id: string, title: string, artistName: string): NominationView => ({
  id,
  won: true,
  text: `${title} — ${artistName}`,
  credit: null,
  subject: { kind: "release_group", album: { id: `rg-${id}`, title, artistName, cover: cover(`rg-${id}`) } },
});
const song = (id: string, title: string, artistName: string): NominationView => ({
  id,
  won: true,
  text: `${title} — ${artistName}`,
  credit: null,
  subject: {
    kind: "recording",
    id: `rec-${id}`,
    title,
    artistName,
    anchor: { id: `rg-${id}`, title: `${title} (single)`, artistName, cover: cover(`rg-${id}`) },
  },
});
const textOnly = (id: string, text: string): NominationView => ({ id, won: true, text, credit: null, subject: null });

const page: CeremonyPage = {
  awardSlug: "grammy-hall-of-fame",
  kind: "hall_of_fame",
  voting: "academy",
  sourceUrl: "https://grammy.com/news/grammy-hall-of-fame-2026-inducted-recordings",
  ceremony: { year: 2026, edition: null, heldOn: "2026-05-08" },
  ceremonies: [
    { year: 2026, edition: null, heldOn: "2026-05-08" },
    { year: 2025, edition: null, heldOn: "2025-05-16" },
  ],
  categories: [
    {
      key: "albums",
      tier: "general",
      field: null,
      name: { es: "Álbumes", en: "Albums" },
      honors: "performer",
      subjectKind: "release_group",
      coverage: "complete",
      nominations: [album("a1", "OK Computer", "Radiohead"), album("a2", "Pink Moon", "Nick Drake")],
    },
    {
      key: "songs",
      tier: "general",
      field: null,
      name: { es: "Canciones", en: "Songs" },
      honors: "performer",
      subjectKind: "recording",
      coverage: "complete",
      nominations: [song("s1", "Trouble in Mind", "Bertha Hill")],
    },
  ],
};

describe("HallOfFameClassView", () => {
  it("se presenta como una clase: sin edición, con la gala, la votación y la fuente", () => {
    renderWithIntl(<HallOfFameClassView page={page} awardName="Salón de la Fama de los Grammy" />);
    expect(screen.getByRole("heading", { level: 1, name: "Clase de 2026" })).toBeInTheDocument();
    expect(screen.getByText(/3 grabaciones · Fecha de la clase: 8 de mayo de 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/edición/i)).not.toBeInTheDocument();
    expect(screen.getByText("Lo elige un comité de la academia")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fuente: grammy.com" })).toHaveAttribute("href", page.sourceUrl);
  });

  it("rotula «Ingresó» a cada incorporación, no «Ganador», y no muestra nominados ni historia de la categoría", () => {
    renderWithIntl(<HallOfFameClassView page={page} awardName="Salón de la Fama de los Grammy" />);
    expect(screen.getAllByText("Ingresó")).toHaveLength(3);
    expect(screen.queryByText("Ganador")).not.toBeInTheDocument();
    expect(screen.queryByText(/Nominados/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Historial|Historia de la categoría/ })).not.toBeInTheDocument();
  });

  it("agrupa por categoría, con su cantidad, y enlaza cada incorporación a su ficha", () => {
    renderWithIntl(<HallOfFameClassView page={page} awardName="Salón de la Fama de los Grammy" />);
    const albums = screen.getByRole("heading", { level: 2, name: /Álbumes/ }).closest("section")!;
    expect(within(albums).getAllByRole("listitem")).toHaveLength(2);
    expect(within(albums).getByRole("link", { name: "OK Computer" }).getAttribute("href")).toMatch(/^\/album\//);
    const songs = screen.getByRole("heading", { level: 2, name: /Canciones/ }).closest("section")!;
    expect(within(songs).getByRole("link", { name: "Trouble in Mind" }).getAttribute("href")).toMatch(/^\/song\//);
  });

  it("ofrece las demás clases como años, la actual marcada", () => {
    renderWithIntl(<HallOfFameClassView page={page} awardName="Salón de la Fama de los Grammy" />);
    const row = screen.getByRole("navigation", { name: "Clase" });
    expect(within(row).getByRole("link", { name: "2025" })).toHaveAttribute("href", "/awards/grammy-hall-of-fame/2025");
    expect(within(row).getByRole("link", { name: "2026" })).toHaveAttribute("aria-current", "page");
  });
});

const hall = (over: Partial<HallOfFameClass> = {}): HallOfFameClass => ({
  awardSlug: "grammy-hall-of-fame",
  voting: "academy",
  year: 2026,
  edition: null,
  heldOn: "2026-05-08",
  years: [2026, 2025, 2024, 2021, 2020],
  inductees: [album("a1", "OK Computer", "Radiohead"), song("s1", "Trouble in Mind", "Bertha Hill"), textOnly("t1", "Orange Blossom Special — The Rouse Brothers")],
  albumCount: 1,
  recordingCount: 2,
  ...over,
});

describe("HallOfFameExploreSection", () => {
  it("no se renderiza sin clases cerradas", () => {
    const { container } = renderWithIntl(<HallOfFameExploreSection halls={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el salón, su última clase y una tarjeta por incorporación, con ancla y enlace a todas las clases", () => {
    const { container } = renderWithIntl(<HallOfFameExploreSection halls={[hall()]} />);
    expect(container.querySelector("section#salon-de-la-fama")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Salón de la Fama" })).toBeInTheDocument();
    expect(screen.getByText("Salón de la Fama de los Grammy · Clase de 2026 · 3 grabaciones")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver todas las clases/ })).toHaveAttribute("href", "/awards/grammy-hall-of-fame");
    expect(container.querySelectorAll("li")).toHaveLength(3);
  });

  it("enlaza las incorporaciones del catálogo y deja como texto las que no lo están", () => {
    renderWithIntl(<HallOfFameExploreSection halls={[hall()]} />);
    expect(screen.getByRole("link", { name: /OK Computer/ }).getAttribute("href")).toMatch(/^\/album\//);
    expect(screen.getByRole("link", { name: /Trouble in Mind/ }).getAttribute("href")).toMatch(/^\/song\//);
    expect(screen.getByText("Orange Blossom Special — The Rouse Brothers")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Orange Blossom/ })).not.toBeInTheDocument();
  });

  it("las canciones muestran la carátula de su disco ancla", () => {
    renderWithIntl(<HallOfFameExploreSection halls={[hall({ inductees: [song("s1", "Trouble in Mind", "Bertha Hill")] })]} />);
    expect(screen.getByTestId("cover")).toBeInTheDocument();
  });

  it("en inglés usa los textos en inglés", () => {
    renderWithIntl(<HallOfFameExploreSection halls={[hall()]} />, "en");
    expect(screen.getByRole("heading", { name: "Hall of Fame" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See all classes/ })).toBeInTheDocument();
  });
});

describe("HallOfFameTile", () => {
  it("dice cuántas clases hay cargadas y cuál es la última, y enlaza al salón", () => {
    renderWithIntl(<HallOfFameTile hall={hall()} />);
    expect(screen.getByText("5 clases · Clase de 2026")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/awards/grammy-hall-of-fame");
  });
});
