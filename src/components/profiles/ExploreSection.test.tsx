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

describe("ExploreSection — faceta de recorrido de artista", () => {
  it("no renderiza nada sin artistas seguidos", async () => {
    expect(await ExploreSection({ artists: [] })).toBeNull();
  });

  it("no muestra ningún indicador cuando el artista no tiene recorrido", async () => {
    render(await ExploreSection({ artists: [artist()] }));
    expect(screen.queryByLabelText("journeyStateInProgress")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("journeyStateComplete")).not.toBeInTheDocument();
  });

  it("muestra el indicador de en curso", async () => {
    render(await ExploreSection({ artists: [artist({ journeyState: "in_progress" })] }));
    expect(screen.getByLabelText("journeyStateInProgress")).toBeInTheDocument();
  });

  it("muestra el indicador de completo", async () => {
    render(await ExploreSection({ artists: [artist({ journeyState: "complete" })] }));
    expect(screen.getByLabelText("journeyStateComplete")).toBeInTheDocument();
  });

  it("un recorrido archivado no llega con journeyState — sin indicador", async () => {
    // journeyStatesForArtists nunca devuelve entradas archivadas (servicio),
    // así que la faceta simplemente no recibe el campo — mismo caso que "sin
    // recorrido": ningún estado "pendiente" ni indicador para ninguno de los dos.
    render(await ExploreSection({ artists: [artist({ journeyState: undefined })] }));
    expect(screen.queryByLabelText("journeyStateInProgress")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("journeyStateComplete")).not.toBeInTheDocument();
  });

  it("no muestra ningún conteo agregado de recorridos", async () => {
    render(
      await ExploreSection({
        artists: [artist({ id: "a1", journeyState: "complete" }), artist({ id: "a2", journeyState: "complete" })],
      }),
    );
    expect(screen.queryByText(/\d+ recorrido/i)).not.toBeInTheDocument();
  });
});
