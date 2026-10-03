import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithIntl, withIntl } from "@/test/i18n-test-utils";
import { ApiError } from "@/lib/api/errors";
import type { AlbumGenreVotesResponse } from "@/lib/api/schemas";
import { GenreVotePanel } from "./GenreVotePanel";

const mocks = vi.hoisted(() => ({
  getAlbumGenreVotes: vi.fn(),
  castGenreVote: vi.fn(),
  removeGenreVote: vi.fn(),
  searchGenres: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/api/genres", () => ({
  getAlbumGenreVotes: mocks.getAlbumGenreVotes,
  castGenreVote: mocks.castGenreVote,
  removeGenreVote: mocks.removeGenreVote,
  searchGenres: mocks.searchGenres,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={`/es${href}`} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const RG = "00000000-0000-4000-8000-000000000001";

const state = (over: Partial<AlbumGenreVotesResponse> = {}): AlbumGenreVotesResponse => ({
  genres: [
    { slug: "shoegaze", name: "shoegaze", nameEs: null, inherited: false, score: 4, rank: "primary", up: null, down: null, mine: null },
    { slug: "dream-pop", name: "dream pop", nameEs: null, inherited: false, score: 2, rank: "secondary", up: null, down: null, mine: 1 },
  ],
  showCounts: false,
  canVote: true,
  reason: null,
  ...over,
});

function renderPanel(interacted = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (value: boolean) => (
    <QueryClientProvider client={client}>
      <GenreVotePanel releaseGroupId={RG} interacted={value} />
    </QueryClientProvider>
  );
  const view = renderWithIntl(ui(interacted));
  return { ...view, rerenderInteracted: (value: boolean) => view.rerender(withIntl(ui(value))) };
}

// El panel ya llega abierto desde "Tu relación": no tiene botón propio.
async function open() {
  return screen.findByRole("region", { name: "Géneros del álbum" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAlbumGenreVotes.mockResolvedValue(state());
  mocks.searchGenres.mockResolvedValue({ genres: [{ slug: "noise-pop", name: "noise pop", nameEs: null }] });
});

describe("GenreVotePanel", () => {
  it("pide los votos al montarse y no tiene botón propio de apertura", async () => {
    renderPanel();
    await open();
    expect(mocks.getAlbumGenreVotes).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Votar géneros" })).not.toBeInTheDocument();
  });

  it("al cambiar la interacción vuelve a pedir el acceso sin remontar el panel", async () => {
    mocks.getAlbumGenreVotes.mockResolvedValueOnce(state({ canVote: false, reason: "no_interaction" }));
    const { rerenderInteracted } = renderPanel(false);
    expect(await screen.findByText("Valora, escucha o colecciona el álbum para votar sus géneros.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "A favor de shoegaze" })).toBeDisabled();

    rerenderInteracted(true);

    await waitFor(() => expect(screen.getByRole("button", { name: "A favor de shoegaze" })).toBeEnabled());
    expect(mocks.getAlbumGenreVotes).toHaveBeenCalledTimes(2);
  });

  it("muestra los géneros con su rango y el voto propio activo", async () => {
    renderPanel();
    await open();
    expect(await screen.findByRole("button", { name: "A favor de dream pop" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "En contra de dream pop" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Principal")).toBeInTheDocument();
    expect(screen.getByText("Secundario")).toBeInTheDocument();
  });

  it("votar a favor guarda el voto y refresca la página", async () => {
    const user = userEvent.setup();
    mocks.castGenreVote.mockResolvedValue(state());
    renderPanel();
    await open();
    await user.click(await screen.findByRole("button", { name: "A favor de shoegaze" }));
    await waitFor(() => expect(mocks.castGenreVote).toHaveBeenCalledWith(RG, "shoegaze", 1));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("pulsar el voto activo lo retira", async () => {
    const user = userEvent.setup();
    mocks.removeGenreVote.mockResolvedValue(state());
    renderPanel();
    await open();
    await user.click(await screen.findByRole("button", { name: "A favor de dream pop" }));
    await waitFor(() => expect(mocks.removeGenreVote).toHaveBeenCalledWith(RG, "dream-pop"));
    expect(mocks.castGenreVote).not.toHaveBeenCalled();
  });

  it("cambiar de ▲ a ▼ guarda -1", async () => {
    const user = userEvent.setup();
    mocks.castGenreVote.mockResolvedValue(state());
    renderPanel();
    await open();
    await user.click(await screen.findByRole("button", { name: "En contra de dream pop" }));
    await waitFor(() => expect(mocks.castGenreVote).toHaveBeenCalledWith(RG, "dream-pop", -1));
  });

  it("propone un género del buscador con +1", async () => {
    const user = userEvent.setup();
    mocks.castGenreVote.mockResolvedValue(state());
    renderPanel();
    await open();
    await user.type(await screen.findByLabelText("Proponer un género"), "noise");
    await user.click(await screen.findByRole("button", { name: "Proponer noise pop" }));
    await waitFor(() => expect(mocks.castGenreVote).toHaveBeenCalledWith(RG, "noise-pop", 1));
  });

  it("muestra las cifras solo cuando la API las trae", async () => {
    mocks.getAlbumGenreVotes.mockResolvedValue(
      state({
        showCounts: true,
        genres: [{ slug: "shoegaze", name: "shoegaze", nameEs: null, inherited: false, score: 4, rank: "primary", up: 5, down: 1, mine: null }],
      }),
    );
    renderPanel();
    await open();
    expect(await screen.findByText("5 a favor, 1 en contra")).toBeInTheDocument();
  });

  it("sin interacción desactiva los controles y explica cómo votar", async () => {
    mocks.getAlbumGenreVotes.mockResolvedValue(state({ canVote: false, reason: "no_interaction" }));
    renderPanel();
    await open();
    expect(await screen.findByText("Valora, escucha o colecciona el álbum para votar sus géneros.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "A favor de shoegaze" })).toBeDisabled();
    expect(screen.getByLabelText("Proponer un género")).toBeDisabled();
  });

  it("sin sesión ofrece iniciar sesión", async () => {
    mocks.getAlbumGenreVotes.mockResolvedValue(state({ canVote: false, reason: "signed_out" }));
    renderPanel();
    await open();
    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/es/auth/login");
  });

  it("avisa de los géneros heredados", async () => {
    mocks.getAlbumGenreVotes.mockResolvedValue(
      state({ genres: [{ slug: "rock", name: "rock", nameEs: null, inherited: true, score: 0, rank: "other", up: null, down: null, mine: null }] }),
    );
    renderPanel();
    await open();
    expect(await screen.findByText(/vienen del artista/)).toBeInTheDocument();
  });

  it("el tope de 8 votos se explica en lugar de un error genérico", async () => {
    const user = userEvent.setup();
    mocks.castGenreVote.mockRejectedValue(new ApiError("VALIDATION_ERROR", 400, "tope"));
    renderPanel();
    await open();
    await user.click(await screen.findByRole("button", { name: "A favor de shoegaze" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("máximo de 8 géneros");
  });

  it("un fallo de la suspensión social muestra su motivo", async () => {
    const user = userEvent.setup();
    mocks.castGenreVote.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    renderPanel();
    await open();
    await user.click(await screen.findByRole("button", { name: "A favor de shoegaze" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("suspensión social");
  });
});
