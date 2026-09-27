import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import type { ArtistDiscographyItem } from "@/services/catalog/artist-discography-view";
import type { DiscographySection } from "@/services/catalog/discography-sections";
import { ArtistDiscography, GRID_PAGE_SIZE } from "./ArtistDiscography";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className, ...rest }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const d = catalogEs.artist.discography;
const ARTIST = "a1";

function item(id: string, overrides: Partial<ArtistDiscographyItem> = {}): ArtistDiscographyItem {
  return {
    id,
    title: `Disco ${id}`,
    year: 1970,
    coverThumbUrl: `https://example.com/${id}.jpg`,
    coverResolved: true,
    section: "main",
    kinds: ["album"],
    isEp: false,
    community: { average: null, count: 0 },
    primaryArtist: null,
    ...overrides,
  };
}

function sections(counts: Partial<Record<DiscographySection, number>>) {
  return (Object.entries(counts) as [DiscographySection, number][]).map(([key, count]) => ({
    key,
    items: Array.from({ length: count }, (_, i) => item(`${key}-${i}`, { section: key })),
  }));
}

function renderDiscography(props: Partial<Parameters<typeof ArtistDiscography>[0]> = {}) {
  return renderWithIntl(
    <ArtistDiscography
      artistId={ARTIST}
      sections={sections({ main: 19, live: 95, compilations: 40, singles: 48, other: 16, appearances: 1 })}
      activeSection="main"
      bestRatedId={null}
      marks={null}
      {...props}
    />,
  );
}

// La vista elegida persiste en `localStorage`: una instancia fresca por test evita que un
// test que cambia a tabla afecte a los siguientes (mismo patrón que ArtistJourneyList).
function installStorage(throwing = false) {
  const map = new Map<string, string>();
  const fail = () => {
    throw new Error("almacenamiento bloqueado");
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: throwing
      ? { getItem: fail, setItem: fail, removeItem: fail, clear: fail }
      : {
          getItem: (k: string) => map.get(k) ?? null,
          setItem: (k: string, v: string) => void map.set(k, v),
          removeItem: (k: string) => void map.delete(k),
          clear: () => map.clear(),
        },
  });
}

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ArtistDiscography", () => {
  it("selector de secciones con su cantidad, en orden, con Principal activa y sin parámetro", () => {
    renderDiscography();
    const nav = screen.getByRole("navigation", { name: d.sectionsLabel });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Principal19", "En vivo95", "Recopilatorios40", "Sencillos48", "Otros16", "Apariciones1"]);
    expect(links[0]).toHaveAttribute("href", `/artist/${ARTIST}`);
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[1]).toHaveAttribute("href", `/artist/${ARTIST}?section=live`);
  });

  it("vista por defecto: grilla en Principal y tabla en las demás", () => {
    const { unmount } = renderDiscography();
    expect(screen.getByRole("button", { name: d.viewGrid })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    unmount();
    renderDiscography({ activeSection: "live" });
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("la elección de vista se recuerda por sección", () => {
    const { unmount } = renderDiscography();
    fireEvent.click(screen.getByRole("button", { name: d.viewTable }));
    expect(screen.getByRole("table")).toBeInTheDocument();
    unmount();
    renderDiscography();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(window.localStorage.getItem("artist-discography-view:main")).toBe("table");
  });

  it("sin almacenamiento disponible usa la vista por defecto sin error", () => {
    installStorage(true);
    renderDiscography();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: d.viewTable }));
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("grilla: etiqueta EP, Mejor valorado y marcas personales", () => {
    renderDiscography({
      sections: [{ key: "main", items: [item("ep", { isEp: true }), item("dsotm", { community: { average: 4.6, count: 40 } })] }],
      bestRatedId: "dsotm",
      marks: { listened: ["ep"], stars: { dsotm: 4.5 } },
    });
    const ep = screen.getByText("Disco ep").closest("a")!;
    expect(within(ep).getByText(d.ep)).toBeInTheDocument();
    expect(within(ep).getByText(d.listened)).toBeInTheDocument();
    const best = screen.getByText("Disco dsotm").closest("a")!;
    expect(within(best).getByText(`★ ${d.bestRated}`)).toBeInTheDocument();
    expect(within(best).getByText("Tu nota: 4,5")).toBeInTheDocument();
  });

  it("grilla: muestra 48 discos y 'Mostrar más' agrega los siguientes", () => {
    renderDiscography({ sections: sections({ main: 300 }) });
    expect(screen.getAllByRole("listitem").filter((li) => li.querySelector("img"))).toHaveLength(GRID_PAGE_SIZE);
    fireEvent.click(screen.getByRole("button", { name: d.showMore }));
    expect(screen.getAllByRole("listitem").filter((li) => li.querySelector("img"))).toHaveLength(GRID_PAGE_SIZE * 2);
  });

  it("tabla: tipo traducido, comunidad con umbral y artista principal en Apariciones", () => {
    renderDiscography({
      sections: [
        { key: "live", items: [item("p", { kinds: ["album", "live"], community: { average: 4.3, count: 41 } }), item("u", { kinds: ["album", "live"], community: { average: null, count: 3 } })] },
        { key: "appearances", items: [item("f", { kinds: ["single"], primaryArtist: { id: "o", name: "Otra banda" } })] },
      ],
      activeSection: "live",
    });
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]!).getAllByText("en vivo").length).toBeGreaterThan(0);
    expect(within(rows[0]!).getAllByText(/★ 4,3 \(41\)/).length).toBeGreaterThan(0);
    expect(within(rows[1]!).getAllByText(/< 5 notas/).length).toBeGreaterThan(0);
  });

  it("tabla de Apariciones indica el artista principal", () => {
    renderDiscography({
      sections: [{ key: "appearances", items: [item("f", { kinds: ["single"], primaryArtist: { id: "o", name: "Otra banda" } })] }],
      activeSection: "appearances",
    });
    expect(screen.getByText("de Otra banda")).toBeInTheDocument();
  });

  it("sin discos muestra el aviso vacío", () => {
    renderDiscography({ sections: [], activeSection: "main" });
    expect(screen.getByText(d.empty)).toBeInTheDocument();
  });
});
