import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { CeremonyPage, HallOfFameClass, NominationView } from "@/services/awards/read";
import { HallOfFameClassView } from "./HallOfFameClassView";
import { HallOfFameExploreSection } from "./HallOfFameExploreSection";
import { HallOfFameLatestRail } from "./HallOfFameLatestRail";
import { HallOfFameTile, HallOfFameTileGrid, tileCovers } from "./HallOfFameTile";

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

  it("no rotula cada incorporación (todas ingresaron) ni muestra nominados ni historia de la categoría", () => {
    renderWithIntl(<HallOfFameClassView page={page} awardName="Salón de la Fama de los Grammy" />);
    expect(screen.queryByText("Ingresó")).not.toBeInTheDocument();
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

  it("la cabecera lleva el nombre del salón como línea normal y enlaza a cada categoría con su cantidad", () => {
    renderWithIntl(<HallOfFameClassView page={page} awardName="Salón de la Fama de los Grammy" />);
    const header = screen.getByRole("banner");
    expect(within(header).getByText("Salón de la Fama de los Grammy").className).not.toMatch(/amber|uppercase/);
    const jump = within(header).getByRole("navigation", { name: "En esta página" });
    expect(within(jump).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Álbumes2", "#categoria-albums"],
      ["Canciones1", "#categoria-songs"],
    ]);
  });

  it("no repite «del disco» cuando el disco se llama como la canción", () => {
    const same = song("s2", "Cocktails for Two", "Spike Jones");
    if (same.subject?.kind === "recording" && same.subject.anchor) same.subject.anchor = { ...same.subject.anchor, title: "Cocktails For Two" };
    const songs = page.categories[1]!;
    const withSame = { ...page, categories: [page.categories[0]!, { ...songs, nominations: [...songs.nominations, same] }] };
    renderWithIntl(<HallOfFameClassView page={withSame} awardName="Salón de la Fama de los Grammy" />);
    expect(screen.getByText("del disco Trouble in Mind (single)")).toBeInTheDocument();
    expect(screen.queryByText(/del disco Cocktails/)).not.toBeInTheDocument();
  });

  it("la miga lleva «Salón de la Fama» (no «Premios») y enlaza al índice y al salón", () => {
    renderWithIntl(<HallOfFameClassView page={page} awardName="Salón de la Fama de los Grammy" />);
    const crumbs = screen.getByRole("navigation", { name: /migas|breadcrumb/i });
    expect(within(crumbs).queryByText("Premios")).not.toBeInTheDocument();
    expect(within(crumbs).getByRole("link", { name: "Salón de la Fama" })).toHaveAttribute("href", "/hall-of-fame");
    expect(within(crumbs).getByRole("link", { name: "Salón de la Fama de los Grammy" })).toHaveAttribute("href", "/hall-of-fame/grammy-hall-of-fame");
  });

  it("ofrece las demás clases como años, la actual marcada", () => {
    renderWithIntl(<HallOfFameClassView page={page} awardName="Salón de la Fama de los Grammy" />);
    const row = screen.getByRole("navigation", { name: "Clase" });
    expect(within(row).getByRole("link", { name: "2025" })).toHaveAttribute("href", "/hall-of-fame/grammy-hall-of-fame/2025");
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

const registry = (over: Partial<HallOfFameClass> = {}): HallOfFameClass =>
  hall({
    awardSlug: "national-recording-registry",
    voting: "jury",
    heldOn: "2026-05-14",
    years: [2026, 2025, 2024, 2023, 2022],
    inductees: [album("r1", "1989", "Taylor Swift"), album("r2", "Weezer", "Weezer"), song("r3", "Single Ladies", "Beyoncé"), album("r4", "Back to Black", "Amy Winehouse")],
    ...over,
  });

describe("HallOfFameExploreSection", () => {
  it("no se renderiza sin clases cerradas", () => {
    const { container } = renderWithIntl(<HallOfFameExploreSection halls={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("con un salón: ancla, encabezado en singular, una tarjeta y «Ver todos» al índice de salones", () => {
    const { container } = renderWithIntl(<HallOfFameExploreSection halls={[hall()]} />);
    expect(container.querySelector("section#salon-de-la-fama")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Salón de la Fama" })).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Ver todos/ })).toHaveAttribute("href", "/hall-of-fame");
  });

  it("con dos salones: encabezado en plural y una tarjeta por salón que abre su clase más reciente", () => {
    const { container } = renderWithIntl(<HallOfFameExploreSection halls={[hall(), registry()]} />);
    expect(screen.getByRole("heading", { name: "Salones de la Fama" })).toBeInTheDocument();
    expect(container.querySelectorAll("section#salon-de-la-fama > ul > li")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Salón de la Fama de los Grammy/ })).toHaveAttribute(
      "href",
      "/hall-of-fame/grammy-hall-of-fame/2026",
    );
    expect(screen.getByRole("link", { name: /Registro Nacional de Grabaciones/ })).toHaveAttribute(
      "href",
      "/hall-of-fame/national-recording-registry/2026",
    );
  });

  it("no lista las incorporaciones de la clase: eso es de su página", () => {
    renderWithIntl(<HallOfFameExploreSection halls={[hall()]} />);
    expect(screen.queryByText("Orange Blossom Special — The Rouse Brothers")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /OK Computer/ })).not.toBeInTheDocument();
  });

  it("en inglés usa los textos en inglés", () => {
    renderWithIntl(<HallOfFameExploreSection halls={[hall(), registry()]} />, "en");
    expect(screen.getByRole("heading", { name: "Halls of Fame" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /National Recording Registry/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See all/ })).toBeInTheDocument();
  });
});

describe("HallOfFameTile", () => {
  it("muestra el nombre, el año de la clase en grande y enlaza a la clase más reciente", () => {
    renderWithIntl(<HallOfFameTile hall={hall()} />);
    expect(screen.getByText("Salón de la Fama de los Grammy")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("3 grabaciones")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/hall-of-fame/grammy-hall-of-fame/2026");
  });

  it("muestra hasta cuatro carátulas, primero las incorporaciones con disco en el catálogo", () => {
    const { container } = renderWithIntl(<HallOfFameTile hall={registry({ inductees: [textOnly("t0", "Speech — Someone"), ...registry().inductees] })} />);
    // Sin carátula, cada una es una portada tipográfica con la inicial del título; la de solo texto queda fuera.
    const strip = container.querySelector(".grid")!;
    expect(strip.children).toHaveLength(4);
    expect(strip.textContent).toBe("1WSB");
  });

  it("tiñe el fondo con la primera carátula disponible", () => {
    const withUrl: NominationView = {
      ...album("u1", "Dookie", "Green Day"),
      subject: {
        kind: "release_group",
        album: {
          id: "rg-u1",
          title: "Dookie",
          artistName: "Green Day",
          cover: { releaseGroupId: "rg-u1", coverThumbUrl: "https://covers.test/dookie.jpg", coverResolved: true },
        },
      },
    };
    const { container } = renderWithIntl(<HallOfFameTile hall={hall({ inductees: [withUrl] })} />);
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("sin ninguna carátula no lleva fondo", () => {
    const { container } = renderWithIntl(<HallOfFameTile hall={hall({ inductees: [textOnly("t1", "Sin ficha")] })} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("no trae datos ni clases anteriores: eso es del índice", () => {
    renderWithIntl(<HallOfFameTile hall={hall()} />);
    expect(screen.queryByText(/5 clases/)).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("HallOfFameLatestRail", () => {
  // jsdom no implementa ResizeObserver (el riel desplazable lo usa para las flechas).
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  it("suma el rango, cuántas clases hay y quién decide, y enlaza todas las clases con la actual marcada", () => {
    renderWithIntl(<HallOfFameLatestRail hall={registry()} />);
    expect(screen.getByText("2022–2026 · 5 clases · Lo elige un comité de selección")).toBeInTheDocument();
    const classes = screen.getByRole("navigation", { name: "Clases de Registro Nacional de Grabaciones" });
    const links = within(classes).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([2026, 2025, 2024, 2023, 2022].map((y) => `/hall-of-fame/national-recording-registry/${y}`));
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });

  it("un salón con una sola clase muestra solo su año", () => {
    renderWithIntl(<HallOfFameLatestRail hall={registry({ years: [2026] })} />);
    expect(screen.getByText("2026 · 1 clase · Lo elige un comité de selección")).toBeInTheDocument();
  });

  it("separa título y artista de una incorporación sin ficha y le pone portada tipográfica", () => {
    renderWithIntl(<HallOfFameLatestRail hall={registry({ inductees: [textOnly("t1", "Rumor Has It — Reba McEntire")] })} />);
    expect(screen.getByText("Rumor Has It")).toBeInTheDocument();
    expect(screen.getByText("Reba McEntire")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
  });
});

describe("tileCovers", () => {
  const withUrl = (id: string): NominationView => {
    const base = album(id, id, "A");
    if (base.subject?.kind !== "release_group") throw new Error("álbum");
    return { ...base, subject: { ...base.subject, album: { ...base.subject.album, cover: { ...base.subject.album.cover, coverThumbUrl: `https://c.test/${id}.jpg` } } } };
  };

  it("pone primero las que tienen carátula, luego las del catálogo sin carátula y al final las de solo texto", () => {
    const picked = tileCovers([textOnly("t1", "x"), album("a1", "Sin tapa", "A"), withUrl("u1"), song("s1", "S", "B"), withUrl("u2")], 4);
    expect(picked.map((n) => n.id)).toEqual(["u1", "u2", "a1", "s1"]);
  });

  it("respeta el tope y el orden curado dentro de cada grupo", () => {
    expect(tileCovers([album("a1", "1", "A"), album("a2", "2", "A"), album("a3", "3", "A")], 2).map((n) => n.id)).toEqual(["a1", "a2"]);
  });
});

describe("HallOfFameTileGrid", () => {
  const many = (prefix: string) => Array.from({ length: 9 }, (_, i) => album(`${prefix}${i}`, `T${i}`, "A"));

  it("con hasta dos salones usa tarjetas anchas: ocho carátulas, las cuatro últimas solo desde lg", () => {
    const { container } = renderWithIntl(<HallOfFameTileGrid halls={[hall({ inductees: many("g") }), registry({ inductees: many("r") })]} />);
    expect(container.querySelector("ul")?.className).not.toContain("lg:grid-cols-5");
    expect([...container.querySelectorAll("ul > li .grid")].map((g) => g.children.length)).toEqual([8, 8]);
    const lgOnly = [...container.querySelectorAll("span")].filter((el) => el.classList.contains("hidden") && el.classList.contains("lg:block"));
    expect(lgOnly).toHaveLength(8);
  });

  it("con tres o más salones vuelve a la grilla de Premios con cuatro carátulas por tarjeta", () => {
    const third = hall({ awardSlug: "otro-salon", inductees: many("o") });
    const { container } = renderWithIntl(<HallOfFameTileGrid halls={[hall({ inductees: many("g") }), registry({ inductees: many("r") }), third]} />);
    expect(container.querySelector("ul")?.className).toContain("lg:grid-cols-5");
    expect([...container.querySelectorAll("ul > li .grid")].map((g) => g.children.length)).toEqual([4, 4, 4]);
  });
});
