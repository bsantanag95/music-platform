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
      artistId: "art-gnr",
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

function review(overrides: Partial<Extract<FeedEntry, { kind: "review" }>> = {}): FeedEntry {
  return {
    kind: "review",
    id: "rev1",
    title: "Un disco para volver",
    body: "La producción respira y cada tema encuentra su lugar sin apuro.",
    createdAt: "2026-08-05T00:00:00Z",
    target: {
      type: "release-group",
      id: "rg7",
      title: "A Moon Shaped Pool",
      artistName: "Radiohead",
      coverThumbUrl: "https://cover/7.jpg",
    },
    author,
    ...overrides,
  };
}

function follow(overrides: Partial<Extract<FeedEntry, { kind: "follow" }>> = {}): FeedEntry {
  return {
    kind: "follow",
    id: "fo1",
    createdAt: "2026-08-06T00:00:00Z",
    author,
    followedUser: { id: "u9", username: "ana", displayName: "Ana" },
    ...overrides,
  };
}

function followArtist(overrides: Partial<Extract<FeedEntry, { kind: "follow-artist" }>> = {}): FeedEntry {
  return {
    kind: "follow-artist",
    id: "fa1",
    createdAt: "2026-08-07T00:00:00Z",
    author,
    artist: { id: "art9", name: "Radiohead" },
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

function albumSongRating(songId: string, overrides: Partial<Extract<FeedEntry, { kind: "rating" }>> = {}): FeedEntry {
  return {
    kind: "rating",
    id: `sweep-${songId}`,
    stars: "4.0",
    detailedScore: null,
    createdAt: "2026-08-09T00:00:00Z",
    target: {
      type: "recording",
      id: songId,
      title: `Tema ${songId}`,
      artistName: "Sabrina Carpenter",
      albumId: "alb-9",
      albumTitle: "Man's Best Friend",
      coverThumbUrl: null,
    },
    author,
    ...overrides,
  };
}

function albumSongFavorite(songId: string, overrides: Partial<Extract<FeedEntry, { kind: "favorite" }>> = {}): FeedEntry {
  return {
    kind: "favorite",
    id: `sweep-fav-${songId}`,
    targetType: "recording",
    audience: "public",
    createdAt: "2026-08-09T00:00:00Z",
    target: {
      id: songId,
      title: `Tema ${songId}`,
      artistName: "Sabrina Carpenter",
      albumId: "alb-9",
      albumTitle: "Man's Best Friend",
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

  describe("enlace al artista acreditado (add-feed-artist-link)", () => {
    it("el nombre del artista es un enlace a su página cuando el objetivo es un álbum o canción", () => {
      renderWithIntl(<FeedActivityList entries={[favorite()]} />);

      expect(screen.getByRole("link", { name: "Guns N' Roses" })).toHaveAttribute(
        "href",
        "/artist/art-gnr",
      );
    });

    it("sin artistId (fuente que no lo puebla), el nombre del artista se muestra como texto plano", () => {
      renderWithIntl(
        <FeedActivityList
          entries={[
            rating({
              target: { type: "release-group", id: "rgx", title: "Disco", artistName: "Sin id", coverThumbUrl: null },
            }),
          ]}
        />,
      );

      expect(screen.getByText("Sin id")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Sin id" })).not.toBeInTheDocument();
    });

    it("un objetivo de tipo artista no duplica el enlace (el título ya enlaza ahí)", () => {
      renderWithIntl(
        <FeedActivityList
          entries={[
            comment({
              target: { type: "artist", id: "art9", title: "Radiohead", artistName: null, coverThumbUrl: null },
            }),
          ]}
        />,
      );

      // un solo enlace "Radiohead": el del título, no uno adicional de artista
      expect(screen.getAllByRole("link", { name: "Radiohead" })).toHaveLength(1);
    });
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

  describe("tramo de álbum: agrupación por tipo no contigua (add-feed-album-sweep)", () => {
    it("3 canciones valoradas del mismo álbum se agrupan con la fila genérica ya existente", () => {
      renderWithIntl(
        <FeedActivityList
          entries={[
            albumSongRating("s1"),
            albumSongRating("s2"),
            albumSongRating("s3"),
          ]}
        />,
      );

      expect(screen.getByText(/valoró 3 canciones/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Tema s1" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Tema s3" })).toBeInTheDocument();
    });

    it("escucha + rating por canción se agrupan por tipo, aunque nunca hay dos seguidas del mismo kind", () => {
      renderWithIntl(
        <FeedActivityList
          entries={[
            listen({ id: "ls1", target: { type: "recording", id: "s1", title: "Tema s1", subtitle: null, artistName: "Sabrina Carpenter", albumId: "alb-9", albumTitle: "Man's Best Friend", coverThumbUrl: null } }),
            albumSongRating("s1"),
            listen({ id: "ls2", target: { type: "recording", id: "s2", title: "Tema s2", subtitle: null, artistName: "Sabrina Carpenter", albumId: "alb-9", albumTitle: "Man's Best Friend", coverThumbUrl: null } }),
            albumSongRating("s2"),
            listen({ id: "ls3", target: { type: "recording", id: "s3", title: "Tema s3", subtitle: null, artistName: "Sabrina Carpenter", albumId: "alb-9", albumTitle: "Man's Best Friend", coverThumbUrl: null } }),
            albumSongRating("s3"),
          ]}
        />,
      );

      // dos filas de grupo: 3 ratings + 3 escuchas
      expect(screen.getByText(/valoró 3 canciones/)).toBeInTheDocument();
      expect(screen.getByText(/registró 3 escuchas/)).toBeInTheDocument();
    });

    it("solo 2 canciones valoradas no alcanza el umbral: se muestran como filas normales", () => {
      renderWithIntl(<FeedActivityList entries={[albumSongRating("s1"), albumSongRating("s2")]} />);

      expect(screen.queryByText(/valoró 2 canciones/)).not.toBeInTheDocument();
      expect(screen.getByText("Tema s1")).toBeInTheDocument();
      expect(screen.getByText("Tema s2")).toBeInTheDocument();
    });

    it("en variant self omite el autor pero conserva las canciones enlazadas", () => {
      renderWithIntl(
        <FeedActivityList
          variant="self"
          entries={[albumSongRating("s1"), albumSongRating("s2"), albumSongRating("s3")]}
        />,
      );

      expect(screen.queryByRole("link", { name: "Fran" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Tema s1" })).toBeInTheDocument();
    });

    it("marcar 3 canciones como favorito (sin rating) también se agrupa", () => {
      renderWithIntl(
        <FeedActivityList
          entries={[albumSongFavorite("s1"), albumSongFavorite("s2"), albumSongFavorite("s3")]}
        />,
      );

      expect(screen.getByText(/marcó 3 favoritos/)).toBeInTheDocument();
    });

    it("un favorito agregado y quitado entre ratings no le quita al grupo de ratings la chance de formarse", () => {
      renderWithIntl(
        <FeedActivityList
          entries={[
            albumSongRating("s1"),
            albumSongFavorite("s2"),
            albumSongRating("s2"),
            albumSongRating("s3"),
          ]}
        />,
      );

      expect(screen.getByText(/valoró 3 canciones/)).toBeInTheDocument();
      // el favorito de paso sigue mostrándose, como su propia fila suelta
      expect(screen.getByText(/Marcó como favorito/)).toBeInTheDocument();
    });
  });

  describe("pico de rotación (add-feed-rotation-peak)", () => {
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
    const sameSong = (createdAt: string): FeedEntry =>
      listen({
        id: `sp-${createdAt}`,
        createdAt,
        target: { type: "recording", id: "rec-rot", title: "Otra vez", subtitle: null, artistName: "Tortoise", coverThumbUrl: null },
      });

    it("una corrida de escuchas del mismo tema se muestra como 'En rotación', no como lista de títulos", () => {
      renderWithIntl(
        <FeedActivityList entries={[sameSong(daysAgo(1)), sameSong(daysAgo(3)), sameSong(daysAgo(5))]} />,
      );

      expect(screen.getByText(/En rotación · 3 registros esta semana/)).toBeInTheDocument();
      // el título del objetivo, enlazado, una sola vez
      expect(screen.getByRole("link", { name: "Otra vez" })).toHaveAttribute("href", "/song/rec-rot");
      expect(screen.queryByText(/registró 3 escuchas/)).not.toBeInTheDocument();
      // fila subordinada: sin celda de carátula
      expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
    });

    it("no muestra métricas de gamificación", () => {
      const { container } = renderWithIntl(
        <FeedActivityList entries={[sameSong(daysAgo(1)), sameSong(daysAgo(2)), sameSong(daysAgo(4))]} />,
      );

      expect(container.textContent).not.toMatch(/🔥|racha|veces/i);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("en el rastro reciente (self) el pico no repite el nombre del propio usuario", () => {
      renderWithIntl(
        <FeedActivityList
          variant="self"
          entries={[sameSong(daysAgo(1)), sameSong(daysAgo(2)), sameSong(daysAgo(3))]}
        />,
      );

      expect(screen.getByText(/En rotación · 3 registros esta semana/)).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Fran" })).not.toBeInTheDocument();
    });
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

  it("una reseña abre con el verbo, muestra el título como titular y asienta el cuerpo como cita en redonda con borde propio", () => {
    renderWithIntl(<FeedActivityList entries={[review()]} />);

    expect(screen.getByText(/Reseñó/)).toBeInTheDocument();
    expect(screen.getByText("Un disco para volver")).toBeInTheDocument();
    const body = screen.getByText(
      "La producción respira y cada tema encuentra su lugar sin apuro.",
    );
    expect(body.className).toMatch(/border-petrol/);
    expect(body.className).not.toMatch(/italic/);
    expect(screen.getByTestId("cover-thumb")).toHaveAttribute("data-cover", "https://cover/7.jpg");
  });

  it("una reseña sin título usa solo el verbo y el rótulo, sin titular", () => {
    renderWithIntl(<FeedActivityList entries={[review({ title: null })]} />);

    expect(screen.getByText(/Reseñó/)).toBeInTheDocument();
    expect(screen.getByText("Reseña")).toBeInTheDocument();
  });

  it("una reseña corta la corrida de valoraciones y no se pliega con ellas", () => {
    renderWithIntl(
      <FeedActivityList
        entries={[
          rating({ id: "r1", target: { type: "release-group", id: "rg1", title: "Uno", artistName: null, coverThumbUrl: null } }),
          rating({ id: "r2", target: { type: "release-group", id: "rg2", title: "Dos", artistName: null, coverThumbUrl: null } }),
          review({ id: "rev9" }),
          rating({ id: "r3", target: { type: "release-group", id: "rg3", title: "Tres", artistName: null, coverThumbUrl: null } }),
        ]}
      />,
    );

    // 2 + 1 + 1 entradas sueltas: ninguna corrida llega a 3, no hay fila de grupo
    expect(screen.queryByText(/valoró 3/)).not.toBeInTheDocument();
    expect(screen.getByText("Un disco para volver")).toBeInTheDocument();
  });

  it("colapsa 3 valoraciones de canción en una fila con el verbo de canciones (tier 3), distinto del de álbumes", () => {
    const songRating = (id: string, title: string): FeedEntry => ({
      kind: "rating",
      id,
      stars: "4.0",
      detailedScore: null,
      createdAt: "2026-08-04T00:00:00Z",
      target: { type: "recording", id: `rec-${id}`, title, artistName: null, coverThumbUrl: null },
      author,
    });
    renderWithIntl(
      <FeedActivityList entries={[songRating("s1", "Uno"), songRating("s2", "Dos"), songRating("s3", "Tres")]} />,
    );

    expect(screen.getByText(/valoró 3 canciones/)).toBeInTheDocument();
    expect(screen.queryByText(/valoró 3 discos/)).not.toBeInTheDocument();
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

  describe("seguir a un usuario (tier 4, add-feed-kind-differentiation)", () => {
    it("una entrada suelta se muestra en una sola línea, sin celda de carátula", () => {
      renderWithIntl(<FeedActivityList entries={[follow()]} />);

      expect(screen.getByText(/siguió a/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/users/ana");
      expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
    });

    it("en variant self omite el autor pero conserva a la persona seguida", () => {
      renderWithIntl(<FeedActivityList entries={[follow()]} variant="self" />);

      expect(screen.queryByRole("link", { name: "Fran" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ana" })).toBeInTheDocument();
    });

    it("una corrida de 3 o más seguidas del mismo autor se pliega en una fila", () => {
      const runEntries = [
        follow({ id: "fo1", followedUser: { id: "u1", username: "uno", displayName: "Uno" } }),
        follow({ id: "fo2", followedUser: { id: "u2", username: "dos", displayName: "Dos" } }),
        follow({ id: "fo3", followedUser: { id: "u3", username: "tres", displayName: "Tres" } }),
      ];
      renderWithIntl(<FeedActivityList entries={runEntries} />);

      expect(screen.getByText(/siguió a 3 personas/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Uno" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Tres" })).toBeInTheDocument();
    });
  });

  describe("seguir a un artista (tier 4, add-artist-follow-feed-entry)", () => {
    it("una entrada suelta se muestra en una sola línea, sin celda de carátula", () => {
      renderWithIntl(<FeedActivityList entries={[followArtist()]} />);

      expect(screen.getByText(/empezó a seguir a/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Radiohead" })).toHaveAttribute("href", "/artist/art9");
      expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
    });

    it("en variant self omite el autor pero conserva al artista seguido", () => {
      renderWithIntl(<FeedActivityList entries={[followArtist()]} variant="self" />);

      expect(screen.queryByRole("link", { name: "Fran" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Radiohead" })).toBeInTheDocument();
    });

    it("una corrida de 3 o más seguidas del mismo autor se pliega en una fila", () => {
      const runEntries = [
        followArtist({ id: "fa1", artist: { id: "a1", name: "Uno" } }),
        followArtist({ id: "fa2", artist: { id: "a2", name: "Dos" } }),
        followArtist({ id: "fa3", artist: { id: "a3", name: "Tres" } }),
      ];
      renderWithIntl(<FeedActivityList entries={runEntries} />);

      expect(screen.getByText(/empezó a seguir a 3 artistas/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Uno" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Tres" })).toBeInTheDocument();
    });

    it("no se mezcla con una corrida de 'seguir a un usuario' del mismo autor", () => {
      const runEntries = [
        follow({ id: "fo1", followedUser: { id: "u1", username: "uno", displayName: "Uno" } }),
        follow({ id: "fo2", followedUser: { id: "u2", username: "dos", displayName: "Dos" } }),
        follow({ id: "fo3", followedUser: { id: "u3", username: "tres", displayName: "Tres" } }),
        followArtist({ id: "fa1", artist: { id: "a1", name: "Cuatro" } }),
        followArtist({ id: "fa2", artist: { id: "a2", name: "Cinco" } }),
        followArtist({ id: "fa3", artist: { id: "a3", name: "Seis" } }),
      ];
      renderWithIntl(<FeedActivityList entries={runEntries} />);

      expect(screen.getByText(/siguió a 3 personas/)).toBeInTheDocument();
      expect(screen.getByText(/empezó a seguir a 3 artistas/)).toBeInTheDocument();
    });
  });

  describe("glifo por tipo (add-feed-kind-differentiation)", () => {
    it("cada tipo de entrada, salvo rating, muestra un ícono junto al verbo", () => {
      const { container } = renderWithIntl(
        <FeedActivityList entries={[comment(), favorite(), review({ title: null })]} />,
      );

      // 3 filas, 3 glifos (uno por MetaLine) — el de reseña se suma al de su rótulo.
      expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
    });

    it("el rating no suma un glifo propio: su medidor VU ya cumple ese rol", () => {
      const { container } = renderWithIntl(<FeedActivityList entries={[rating()]} />);

      // Único SVG en la fila de rating: ninguno (el medidor VU no es un <svg>).
      expect(container.querySelector("svg")).toBeNull();
    });
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
