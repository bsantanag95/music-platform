import { afterEach, describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { FeedActivityList } from "./FeedActivityList";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { FeedEntry } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ cover, label }: { cover: string | null; label: string }) => (
    <span data-testid="cover-thumb" data-cover={cover ?? ""}>
      {label}
    </span>
  ),
}));

const author = { id: "u1", username: "fran", displayName: "Fran" };

function comment(overrides: Partial<Extract<FeedEntry, { kind: "comment" }>> = {}): FeedEntry {
  return {
    kind: "comment",
    id: "c1",
    body: "Cada vez que lo vuelvo a poner encuentro algo nuevo.",
    createdAt: "2026-08-01T00:00:00Z",
    target: {
      type: "release-group",
      id: "rg1",
      title: "Currents",
      artistName: "Tame Impala",
      coverThumbUrl: "https://cover/1.jpg",
    },
    author,
    ...overrides,
  };
}

function favorite(): FeedEntry {
  return {
    kind: "favorite",
    id: "f1",
    targetType: "release-group",
    audience: "public",
    createdAt: "2026-08-02T00:00:00Z",
    target: {
      id: "rg2",
      title: "Appetite for Destruction",
      artistName: "Guns N' Roses",
      coverThumbUrl: "https://cover/2.jpg",
    },
    author,
  };
}

function rating(overrides: Partial<Extract<FeedEntry, { kind: "rating" }>> = {}): FeedEntry {
  return {
    kind: "rating",
    id: "r1",
    stars: "4.5",
    detailedScore: 87,
    createdAt: "2026-08-04T00:00:00Z",
    target: {
      type: "release-group",
      id: "rg3",
      title: "In Rainbows",
      artistName: "Radiohead",
      coverThumbUrl: null,
    },
    author,
    ...overrides,
  };
}

function listen(overrides: Partial<Extract<FeedEntry, { kind: "listen" }>> = {}): FeedEntry {
  return {
    kind: "listen",
    id: "l1",
    listenContext: "first_listen",
    body: null,
    reaction: null,
    audience: "public",
    createdAt: "2026-08-03T00:00:00Z",
    target: {
      type: "recording",
      id: "rec1",
      title: "Fear of the Dark",
      subtitle: null,
      artistName: "Iron Maiden",
      coverThumbUrl: null,
    },
    author,
    ...overrides,
  };
}

describe("FeedActivityList", () => {
  it("un comentario asienta el cuerpo completo como cita y abre con su carátula", () => {
    renderWithIntl(<FeedActivityList entries={[comment()]} />);

    const body = screen.getByText("Cada vez que lo vuelvo a poner encuentro algo nuevo.");
    expect(body).toBeInTheDocument();
    expect(screen.getByTestId("cover-thumb")).toHaveAttribute("data-cover", "https://cover/1.jpg");
  });

  it("un comentario se muestra en redonda y sin comillas — crítica u humor, no una impresión sentida", () => {
    renderWithIntl(<FeedActivityList entries={[comment()]} />);

    const body = screen.getByText("Cada vez que lo vuelvo a poner encuentro algo nuevo.");
    expect(body.className).toMatch(/border-l/);
    expect(body.className).not.toMatch(/italic/);
    expect(body.className).not.toMatch(/bg-ink-surface/);
    expect(body.textContent).toBe("Cada vez que lo vuelvo a poner encuentro algo nuevo.");
  });

  it("una nota de escucha se muestra en cursiva y entre comillas — la misma voz que /me/diary", () => {
    renderWithIntl(<FeedActivityList entries={[listen({ body: "Me voló la cabeza" })]} />);

    const body = screen.getByText(
      (_, node) => node?.tagName === "P" && node?.textContent === "“Me voló la cabeza”",
    );
    expect(body.className).toMatch(/border-l/);
    expect(body.className).toMatch(/italic/);
  });

  it("toda fila abre con la celda izquierda: carátula si hay, disco si no", () => {
    renderWithIntl(
      <FeedActivityList entries={[favorite(), listen({ id: "l9" })]} />,
    );

    const cells = screen.getAllByTestId("cover-thumb");
    expect(cells).toHaveLength(2);
    expect(cells[0]).toHaveAttribute("data-cover", "https://cover/2.jpg"); // favorito de álbum
    expect(cells[1]).toHaveAttribute("data-cover", ""); // escucha de canción → disco
  });

  it("muestra el artista debajo del título para álbumes y canciones", () => {
    renderWithIntl(<FeedActivityList entries={[favorite()]} />);

    expect(screen.getByText("Appetite for Destruction")).toBeInTheDocument();
    expect(screen.getByText("Guns N' Roses")).toBeInTheDocument();
  });

  it("un rating se muestra con el medidor VU y el valor numérico (estrellas + score)", () => {
    renderWithIntl(<FeedActivityList entries={[rating()]} />);

    // valor numérico visible
    expect(screen.getByText("4.5 · 87")).toBeInTheDocument();
    // el medidor lleva un aria-label legible
    expect(screen.getByRole("img", { name: /4\.5.*5.*87.*100/ })).toBeInTheDocument();
    // el verbo del metadato es corto, no "Valoró con 4.5 estrellas"
    expect(screen.queryByText(/Valoró con/)).not.toBeInTheDocument();
  });

  it("una escucha sin nota con reacción la muestra inline y no abre panel de prosa", () => {
    const { container } = renderWithIntl(
      <FeedActivityList entries={[listen({ reaction: "loved" })]} />,
    );

    expect(screen.getByText("Me encantó")).toBeInTheDocument();
    expect(container.querySelector("p.bg-ink-surface")).toBeNull();
  });

  it("la fecha se muestra relativa y conserva el ISO en el elemento de tiempo", () => {
    const { container } = renderWithIntl(<FeedActivityList entries={[comment()]} />);

    const time = container.querySelector("time");
    expect(time).toHaveAttribute("dateTime", "2026-08-01T00:00:00Z");
    expect(time?.textContent).not.toBe("2026-08-01T00:00:00Z");
  });

  it("colapsa 3 escuchas seguidas de un autor en una fila con los títulos", () => {
    const runEntries = [
      listen({ id: "l1", target: { type: "recording", id: "r1", title: "Uno", subtitle: null, artistName: null, coverThumbUrl: null } }),
      listen({ id: "l2", target: { type: "recording", id: "r2", title: "Dos", subtitle: null, artistName: null, coverThumbUrl: null } }),
      listen({ id: "l3", target: { type: "recording", id: "r3", title: "Tres", subtitle: null, artistName: null, coverThumbUrl: null } }),
    ];
    renderWithIntl(<FeedActivityList entries={runEntries} />);

    expect(screen.getByText(/registró 3 escuchas/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Uno" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tres" })).toBeInTheDocument();
    // una sola fila: ninguna celda de carátula
    expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
  });

  it("colapsa 3 valoraciones seguidas de un autor en una fila con títulos y valores", () => {
    const runEntries = [
      rating({ id: "r1", stars: "4.5", detailedScore: 87, target: { type: "release-group", id: "rg1", title: "Uno", artistName: null, coverThumbUrl: null } }),
      rating({ id: "r2", stars: "3.0", detailedScore: null, target: { type: "release-group", id: "rg2", title: "Dos", artistName: null, coverThumbUrl: null } }),
      rating({ id: "r3", stars: "5.0", detailedScore: 100, target: { type: "release-group", id: "rg3", title: "Tres", artistName: null, coverThumbUrl: null } }),
    ];
    renderWithIntl(<FeedActivityList entries={runEntries} />);

    expect(screen.getByText(/valoró 3 discos/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Uno" })).toBeInTheDocument();
    expect(screen.getByText("(4.5 · 87)")).toBeInTheDocument();
    expect(screen.getByText("(3.0)")).toBeInTheDocument();
    // una sola fila: ningún medidor VU individual, ninguna celda de carátula
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
  });

  it("el rastro propio (variant self) no muestra celda ni autor", () => {
    renderWithIntl(<FeedActivityList entries={[comment(), favorite()]} variant="self" />);

    expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Fran" })).not.toBeInTheDocument();
    // el objetivo sigue enlazado
    expect(screen.getByRole("link", { name: "Currents" })).toBeInTheDocument();
  });

  it("no ofrece controles de acción, solo enlaces de navegación", () => {
    renderWithIntl(<FeedActivityList entries={[comment(), favorite()]} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Fran" }).length).toBeGreaterThan(0);
  });

  describe("avatar de iniciales del autor", () => {
    it("muestra la inicial del displayName, decorativo (no duplica el nombre para lector de pantalla)", () => {
      const { container } = renderWithIntl(<FeedActivityList entries={[comment()]} />);

      const avatar = container.querySelector('[aria-hidden="true"].rounded-full');
      expect(avatar).not.toBeNull();
      expect(avatar).toHaveTextContent("F"); // "Fran"
    });

    it("sin displayName, usa la inicial del username", () => {
      const { container } = renderWithIntl(
        <FeedActivityList
          entries={[comment({ author: { id: "u2", username: "eli", displayName: null } })]}
        />,
      );

      const avatar = container.querySelector('[aria-hidden="true"].rounded-full');
      expect(avatar).toHaveTextContent("E");
    });

    it("el color es determinístico: el mismo autor siempre cae en la misma variante", () => {
      const { container } = renderWithIntl(<FeedActivityList entries={[comment(), favorite()]} />);

      const avatars = container.querySelectorAll('[aria-hidden="true"].rounded-full');
      expect(avatars).toHaveLength(2); // mismo autor ("Fran") en ambas entradas
      expect(avatars[0]!.className).toBe(avatars[1]!.className);
    });

    it("nunca usa ámbar (reservado por la Regla de Rareza)", () => {
      const { container } = renderWithIntl(<FeedActivityList entries={[comment(), favorite()]} />);

      const avatar = container.querySelector('[aria-hidden="true"].rounded-full');
      expect(avatar!.className).not.toMatch(/amber|accent/);
    });

    it("no aparece en el rastro propio (variant self), donde ya se omite el autor", () => {
      const { container } = renderWithIntl(<FeedActivityList entries={[comment()]} variant="self" />);

      expect(container.querySelector('[aria-hidden="true"].rounded-full')).toBeNull();
    });
  });

  describe("plegado de citas largas (clamp)", () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");

    afterEach(() => {
      if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
      vi.restoreAllMocks();
    });

    // jsdom no hace layout real — se simula desborde mockeando `scrollHeight`
    // (alto real) y `lineHeight` (umbral) para que `ProsePanel` decida plegar.
    function mockOverflow() {
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        get: () => 400,
      });
      const original = window.getComputedStyle.bind(window);
      vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
        const style = original(el, pseudo);
        Object.defineProperty(style, "lineHeight", { configurable: true, value: "20px" });
        return style;
      });
    }

    it("con `clamp`, una cita larga muestra el botón de expandir", () => {
      mockOverflow();
      renderWithIntl(<FeedActivityList entries={[comment()]} clamp />);

      expect(screen.getByRole("button", { name: "Ver más" })).toBeInTheDocument();
    });

    it("sin `clamp` (uso de Inicio vía ScrollablePreviewList), nunca muestra el botón — ni con la misma entrada que sí lo mostraría en /me/feed", () => {
      mockOverflow();
      renderWithIntl(<FeedActivityList entries={[comment()]} />);

      expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
    });
  });
});
