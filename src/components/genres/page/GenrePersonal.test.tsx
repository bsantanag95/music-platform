import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ApiError } from "@/lib/api/errors";
import { GenreFootprint } from "./GenreFootprint";
import { GenreMoveButton } from "./GenreMoveButton";
import { GenreStatsLine } from "./GenreStatsLine";

const mocks = vi.hoisted(() => ({ add: vi.fn(), remove: vi.fn() }));

vi.mock("@/lib/api/genres", () => ({ addIdentityGenre: mocks.add, removeIdentityGenre: mocks.remove }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
}));

function renderButton(initialDeclared: boolean) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <GenreMoveButton slug="shoegaze" initialDeclared={initialDeclared} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GenreMoveButton", () => {
  it("'Me mueve' agrega el género y pasa a 'Ya me mueve' con el estado de la lista devuelta", async () => {
    mocks.add.mockResolvedValue({ genres: ["jazz", "shoegaze"] });
    renderButton(false);
    const button = screen.getByRole("button", { name: "Me mueve" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(mocks.add).toHaveBeenCalledWith("shoegaze");
    expect(await screen.findByRole("button", { name: "Ya me mueve" })).toHaveAttribute("aria-pressed", "true");
  });

  it("'Ya me mueve' lo quita", async () => {
    mocks.remove.mockResolvedValue({ genres: ["jazz"] });
    renderButton(true);
    await userEvent.click(screen.getByRole("button", { name: "Ya me mueve" }));
    expect(mocks.remove).toHaveBeenCalledWith("shoegaze");
    expect(await screen.findByRole("button", { name: "Me mueve" })).toBeInTheDocument();
  });

  it("con la lista llena muestra el motivo localizado y no cambia el estado", async () => {
    mocks.add.mockRejectedValue(new ApiError("MUSIC_IDENTITY_GENRES_FULL", 409, "lleno"));
    renderButton(false);
    await userEvent.click(screen.getByRole("button", { name: "Me mueve" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Quita uno de «Géneros que me mueven» en tu perfil");
    expect(screen.getByRole("button", { name: "Me mueve" })).toHaveAttribute("aria-pressed", "false");
  });

  it("un error desconocido muestra el mensaje genérico", async () => {
    mocks.add.mockRejectedValue(new Error("boom"));
    renderButton(false);
    await userEvent.click(screen.getByRole("button", { name: "Me mueve" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("se deshabilita mientras guarda para no duplicar el envío", async () => {
    let resolve: (value: { genres: string[] }) => void = () => {};
    mocks.add.mockReturnValue(new Promise((r) => (resolve = r)));
    renderButton(false);
    await userEvent.click(screen.getByRole("button", { name: "Me mueve" }));
    expect(screen.getByRole("button", { name: "Me mueve" })).toBeDisabled();
    resolve({ genres: ["shoegaze"] });
    await screen.findByRole("button", { name: "Ya me mueve" });
    expect(mocks.add).toHaveBeenCalledTimes(1);
  });
});

describe("GenreFootprint", () => {
  const start = { kind: "essentials" as const, href: "/genre/shoegaze#genre-essentials" };

  it("muestra álbumes valorados, media, pendientes y los favoritos enlazados", () => {
    renderWithIntl(
      <GenreFootprint
        start={start}
        footprint={{
          ratedCount: 7,
          averageStars: 3.9,
          pendingCount: 2,
          favorites: [
            { id: "a", title: "Souvlaki", stars: 5 },
            { id: "b", title: "Loveless", stars: 4.5 },
          ],
        }}
      />,
    );
    expect(screen.getByText(/7 álbumes valorados/)).toBeInTheDocument();
    expect(screen.getByText(/tu media: 3,9/)).toBeInTheDocument();
    expect(screen.getByText("2 álbumes pendientes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Souvlaki" })).toHaveAttribute("href", expect.stringMatching(/^\/es\/album\//));
    expect(screen.queryByText(/Todavía no has valorado/)).toBeNull();
  });

  it("solo pendientes: no muestra la línea de valoraciones ni cifras en cero", () => {
    renderWithIntl(<GenreFootprint start={start} footprint={{ ratedCount: 0, averageStars: null, pendingCount: 3, favorites: [] }} />);
    expect(screen.getByText("3 álbumes pendientes")).toBeInTheDocument();
    expect(screen.queryByText(/valorados/)).toBeNull();
    expect(screen.queryByText("Tus favoritos")).toBeNull();
  });

  it("sin actividad invita a empezar por los Esenciales", () => {
    renderWithIntl(<GenreFootprint start={start} footprint={{ ratedCount: 0, averageStars: null, pendingCount: 0, favorites: [] }} />);
    expect(screen.getByText(/Todavía no has valorado ni guardado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Empieza por los Esenciales" })).toHaveAttribute("href", "/es/genre/shoegaze#genre-essentials");
    expect(screen.queryByText(/\b0 álbumes/)).toBeNull();
  });

  it("sin actividad y sin Esenciales invita a la pestaña Álbumes", () => {
    renderWithIntl(
      <GenreFootprint
        start={{ kind: "albums", href: "/genre/shoegaze?tab=albums" }}
        footprint={{ ratedCount: 0, averageStars: null, pendingCount: 0, favorites: [] }}
      />,
    );
    expect(screen.getByRole("link", { name: "Explora los álbumes del género" })).toHaveAttribute("href", "/es/genre/shoegaze?tab=albums");
  });
});

describe("GenreStatsLine: personas a las que les mueve", () => {
  const stats = { albumCount: 5, artistCount: 2, ratingCount: null, averageStars: null, peakDecade: null, decades: [], allDecades: [] };

  it("muestra la cifra cuando el servicio la entrega", () => {
    renderWithIntl(<GenreStatsLine stats={stats} movedBy={12} />);
    expect(screen.getByText(/Les mueve a 12 personas/)).toBeInTheDocument();
  });

  it("sin cifra (bajo el umbral) no muestra nada", () => {
    renderWithIntl(<GenreStatsLine stats={stats} movedBy={null} />);
    expect(screen.queryByText(/Les mueve/)).toBeNull();
  });
});
