import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { ExploreSection } from "./ExploreSection";
import type { FollowedArtist } from "@/services/social/artist-following";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} alt={props.alt as string} />,
}));

function artist(over: Partial<FollowedArtist> = {}): FollowedArtist {
  return { id: "a1", name: "Deep Purple", type: "group", photoUrl: null, ...over };
}

function artists(n: number): FollowedArtist[] {
  return Array.from({ length: n }, (_, i) => artist({ id: `a${i}`, name: `Artist ${i}` }));
}

describe("ExploreSection — faceta de recorrido de artista", () => {
  it("no renderiza nada sin artistas seguidos", async () => {
    expect(await ExploreSection({ username: "ana", artists: [], totalCount: 0 })).toBeNull();
  });

  it("no muestra ningún indicador cuando el artista no tiene recorrido", async () => {
    render(await ExploreSection({ username: "ana", artists: [artist()], totalCount: 1 }));
    expect(screen.queryByLabelText("journeyStateInProgress")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("journeyStateComplete")).not.toBeInTheDocument();
  });

  it("muestra el indicador de en curso", async () => {
    render(
      await ExploreSection({ username: "ana", artists: [artist({ journeyState: "in_progress" })], totalCount: 1 }),
    );
    expect(screen.getByLabelText("journeyStateInProgress")).toBeInTheDocument();
  });

  it("muestra el indicador de completo", async () => {
    render(await ExploreSection({ username: "ana", artists: [artist({ journeyState: "complete" })], totalCount: 1 }));
    expect(screen.getByLabelText("journeyStateComplete")).toBeInTheDocument();
  });

  it("un recorrido archivado no llega con journeyState — sin indicador", async () => {
    render(
      await ExploreSection({ username: "ana", artists: [artist({ journeyState: undefined })], totalCount: 1 }),
    );
    expect(screen.queryByLabelText("journeyStateInProgress")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("journeyStateComplete")).not.toBeInTheDocument();
  });

  it("no muestra ningún conteo agregado de recorridos", async () => {
    render(
      await ExploreSection({
        username: "ana",
        artists: [artist({ id: "a1", journeyState: "complete" }), artist({ id: "a2", journeyState: "complete" })],
        totalCount: 2,
      }),
    );
    expect(screen.queryByText(/\d+ recorrido/i)).not.toBeInTheDocument();
  });
});

describe("ExploreSection — insignia de afinidad 'tú también' (openspec: rework-user-profile)", () => {
  it("marca solo los artistas presentes en sharedArtistIds", async () => {
    render(
      await ExploreSection({
        username: "ana",
        artists: [artist({ id: "a1", name: "Radiohead" }), artist({ id: "a2", name: "Boygenius" })],
        totalCount: 2,
        sharedArtistIds: new Set(["a1"]),
      }),
    );
    const badges = screen.getAllByText("explorationMutualBadge");
    expect(badges).toHaveLength(1);
  });

  it("sin sharedArtistIds (dueño propio o visitante sin sesión) no muestra ninguna insignia", async () => {
    render(await ExploreSection({ username: "ana", artists: [artist({ id: "a1" })], totalCount: 1 }));
    expect(screen.queryByText("explorationMutualBadge")).not.toBeInTheDocument();
  });

  it("con sharedArtistIds vacío tampoco muestra ninguna insignia", async () => {
    render(
      await ExploreSection({ username: "ana", artists: [artist({ id: "a1" })], totalCount: 1, sharedArtistIds: new Set() }),
    );
    expect(screen.queryByText("explorationMutualBadge")).not.toBeInTheDocument();
  });
});

describe("ExploreSection — tope de 8 celdas con link '+N' (Opción B)", () => {
  it("totalCount igual a lo traído: muestra todos los artistas, sin celda de link", async () => {
    render(await ExploreSection({ username: "ana", artists: artists(8), totalCount: 8 }));
    expect(screen.getAllByRole("link")).toHaveLength(8);
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it("totalCount mayor a lo traído: 7 artistas + celda '+N' al listado completo", async () => {
    render(await ExploreSection({ username: "ana", artists: artists(8), totalCount: 9 }));
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(8); // 7 artistas + 1 celda de link
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("explorationMoreLabel")).toBeInTheDocument();
    const moreLink = screen.getByText("+2").closest("a");
    expect(moreLink).toHaveAttribute("href", "/users/ana/artists");
    // El octavo artista fetcheado no se muestra — la celda de link ocupa su lugar.
    expect(screen.queryByText("Artist 7")).not.toBeInTheDocument();
    expect(screen.getByText("Artist 6")).toBeInTheDocument();
  });
});
