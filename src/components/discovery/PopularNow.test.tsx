import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { PopularSection } from "@/services/discovery/discovery";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { PopularNow } from "./PopularNow";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/AlbumCard", () => ({
  AlbumCard: ({ releaseGroup, stat }: { releaseGroup: { title: string }; stat?: string }) => (
    <span>
      {releaseGroup.title}
      {stat ? ` [${stat}]` : ""}
    </span>
  ),
}));
// El riel desplazable mide el DOM; aquí basta con sus hijos.
vi.mock("./RailScroller", () => ({
  RailScroller: ({ header, children }: { header: React.ReactNode; children: React.ReactNode }) => (
    <div>
      {header}
      <ul>{children}</ul>
    </div>
  ),
}));

const categoryLabels: Record<ReleaseGroupCategory, string> = {
  studio: "De estudio",
  single_ep: "Singles y EPs",
  compilation: "Compilaciones",
  live_other: "Directos y otros",
};

const album = (id: string, people: number) =>
  ({ id, title: `Disco ${id}`, category: "studio", people }) as unknown as NonNullable<PopularSection["albums"]>["items"][number];

const full: PopularSection = {
  albums: { window: "month", items: [album("a", 7), album("b", 2)] },
  artists: { window: "quarter", items: [{ id: "x", name: "Zoe", photoUrl: null, people: 6 }] },
  songs: { window: "all", items: [{ id: "s", title: "Canción", artistName: "Zoe", coverThumbUrl: null, people: 1 }] },
};

const render = (section: PopularSection) =>
  renderWithIntl(
    <PopularNow
      section={section}
      heading="Popular ahora"
      tabsLabel="Qué ver"
      tabLabels={{ albums: "Álbumes", artists: "Artistas", songs: "Canciones" }}
      windowDescription={(window) => `ventana:${window}`}
      peopleLabel={(count) => `${count} personas`}
      categoryLabels={categoryLabels}
      coverLabel="Carátula"
    />,
  );

describe("PopularNow", () => {
  it("muestra las tres pestañas con Álbumes activa y el subtítulo de su ventana", () => {
    render(full);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Álbumes", "Artistas", "Canciones"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("ventana:month")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Popular ahora" })).toBeInTheDocument();
  });

  it("la cifra de personas solo aparece desde 5", () => {
    render(full);

    expect(screen.getByText("Disco a [7 personas]")).toBeInTheDocument();
    expect(screen.getByText("Disco b")).toBeInTheDocument();
  });

  it("al cambiar de pestaña muestra su panel y el subtítulo de su ventana, sin recargar", () => {
    render(full);

    fireEvent.click(screen.getByRole("tab", { name: "Artistas" }));

    expect(screen.getByRole("tab", { name: "Artistas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("ventana:quarter")).toBeInTheDocument();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByRole("link", { name: /Zoe/ })).toHaveAttribute("href", expect.stringContaining("/artist"));
    expect(within(panel).getByText("6 personas")).toBeInTheDocument();
  });

  it("se mueve entre pestañas con las flechas", () => {
    render(full);

    fireEvent.keyDown(screen.getByRole("tab", { name: "Álbumes" }), { key: "ArrowLeft" });

    expect(screen.getByRole("tab", { name: "Canciones" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Canciones" })).toHaveFocus();
  });

  it("una pestaña sin resultado no aparece", () => {
    render({ ...full, songs: null });

    expect(screen.queryByRole("tab", { name: "Canciones" })).toBeNull();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("sin ninguna pestaña la sección no se renderiza", () => {
    const { container } = render({ albums: null, artists: null, songs: null });

    expect(container).toBeEmptyDOMElement();
  });

  it("con una sola pestaña no pinta la barra de pestañas", () => {
    render({ albums: null, artists: full.artists, songs: null });

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText("ventana:quarter")).toBeInTheDocument();
  });
});
