import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { SongRelationPanel, type SongRelationState } from "./SongRelationPanel";
import type { RatingsResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  createListenEntry: vi.fn(),
  toggleFavorite: vi.fn(),
  saveRating: vi.fn(),
  getRatings: vi.fn(),
  deleteRating: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: mocks.createListenEntry }));
vi.mock("@/lib/api/favorites", () => ({ toggleFavorite: mocks.toggleFavorite }));
vi.mock("@/lib/api/want-to-listen", () => ({ toggleWantToListen: vi.fn() }));
vi.mock("@/lib/api/social", () => ({
  saveRating: mocks.saveRating,
  getRatings: mocks.getRatings,
  deleteRating: mocks.deleteRating,
  highlightRating: vi.fn(),
  unhighlightRating: vi.fn(),
}));
vi.mock("@/components/diary/ListenEntryForm", () => ({ ListenEntryForm: () => <div>formulario de escucha</div> }));
vi.mock("@/components/collection/CollectionAlbumAction", () => ({ CollectionAlbumAction: () => null }));
vi.mock("@/components/album/AlbumListPicker", () => ({
  AlbumListPicker: ({ target }: { target: { type: string } }) => <div>selector de listas de {target.type}</div>,
}));

const relation = catalogEs.album.relation;
const song = catalogEs.song.relation;
const REC = "550e8400-e29b-41d4-a716-446655440000";
const RATING_ID = "550e8400-e29b-41d4-a716-446655440009";

function ratings(stars: number | null, detailedScore: number | null = null): RatingsResponse {
  return {
    own: stars === null ? null : { id: RATING_ID, stars, detailedScore, createdAt: "", updatedAt: "" },
    aggregate: { count: stars === null ? 0 : 1, averageStars: null, averageDetailedScore: null },
  };
}

function makeState(overrides: Partial<SongRelationState> = {}): SongRelationState {
  return {
    ratings: ratings(null),
    listens: { count: 0, lastAt: null, lastReaction: null },
    favorited: false,
    ownListMemberships: [],
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("SongRelationPanel", () => {
  it("a un visitante anónimo le ofrece iniciar sesión, sin controles de escritura", () => {
    renderWithIntl(<SongRelationPanel recordingId={REC} state={null} />);
    expect(screen.getByText(song.signInPrompt)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: relation.signIn })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sin interacción: estrellas visibles de entrada, escuchas, favorita y listas; sin reseña ni Pendiente", () => {
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(10);
    expect(screen.getByText(relation.listensNone)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: song.logListen })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: song.favorite })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("En ninguna de tus listas")).toBeInTheDocument();
    expect(screen.queryByText(relation.writeReview)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: relation.pending })).not.toBeInTheDocument();
    expect(screen.queryByText(relation.collection)).not.toBeInTheDocument();
  });

  it("con escuchas muestra el historial en una línea con la última reacción y el enlace al diario", () => {
    renderWithIntl(
      <SongRelationPanel
        recordingId={REC}
        state={makeState({
          listens: { count: 3, lastAt: "2026-09-12T15:00:00.000Z", lastReaction: "obsessed" },
          favorited: true,
          ownListMemberships: [{ listId: "l1", itemId: "i1", kind: "standard", title: "Baladas" }],
        })}
      />,
    );
    // Dos líneas fijas: el historial y el diario, sin separadores sueltos.
    expect(screen.getByText(/^3 · última: Obsesión, 12 sept?\.?$/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${song.diaryLink} →` })).toHaveAttribute("href", "/me/diary");
    expect(screen.getByRole("button", { name: song.favorite })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("En 1 de tus listas")).toBeInTheDocument();
  });

  it("muestra el puntaje detallado con su escala", () => {
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState({ ratings: ratings(4.5, 88) })} />);
    expect(screen.getByRole("button", { name: /Puntuación detallada 88/ })).toHaveTextContent("88/100");
  });

  it("sin escuchas dice 'Ninguna' y no ofrece el diario", () => {
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState()} />);
    expect(screen.getByText(relation.listensNone)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: new RegExp(song.diaryLink) })).not.toBeInTheDocument();
  });

  it("Favorita es una fila compacta con un conmutador", () => {
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState({ favorited: true })} />);
    const toggle = screen.getByRole("button", { name: song.favorite });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).not.toHaveTextContent(song.favorite);
    expect(screen.getByText(song.favorite)).toBeInTheDocument();
  });

  it("valorar guarda la nota de la grabación y actualiza sin recargar", async () => {
    mocks.saveRating.mockResolvedValue({});
    mocks.getRatings.mockResolvedValue(ratings(4.5));
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState()} />);

    fireEvent.click(screen.getByRole("radio", { name: "4,5 estrellas" }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("recording", REC, { stars: 4.5 }));
    await waitFor(() => expect(screen.getByRole("radio", { name: "4,5 estrellas" })).toBeChecked());
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("si falla el guardado vuelve a la nota anterior y muestra el error", async () => {
    mocks.saveRating.mockRejectedValue(new Error("red"));
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState({ ratings: ratings(2) })} />);

    fireEvent.click(screen.getByRole("radio", { name: "4,0 estrellas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(relation.saveError);
    expect(screen.getByRole("radio", { name: "2,0 estrellas" })).toBeChecked();
  });

  it("quita la nota de la canción de forma dinámica tras confirmar", async () => {
    mocks.deleteRating.mockResolvedValue(null);
    mocks.getRatings.mockResolvedValue(ratings(null));
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState({ ratings: ratings(4.5, 88) })} />);

    fireEvent.click(screen.getByRole("button", { name: relation.clearRating }));
    fireEvent.click(screen.getByRole("button", { name: relation.clearRatingConfirm }));

    await waitFor(() => expect(mocks.deleteRating).toHaveBeenCalledWith("recording", REC));
    await waitFor(() => expect(screen.queryByRole("button", { name: relation.clearRating })).not.toBeInTheDocument());
    expect(screen.getByRole("radio", { name: "4,5 estrellas" })).not.toBeChecked();
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("registrar una escucha abre el formulario del diario (donde se elige la reacción)", async () => {
    mocks.createListenEntry.mockResolvedValue({
      id: "e1",
      target: { type: "recording", id: REC },
      listenContext: "first_listen",
      body: null,
      reaction: null,
      audience: "followers",
      createdAt: "2026-09-27T10:00:00.000Z",
    });
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState()} />);

    fireEvent.click(screen.getByRole("button", { name: song.logListen }));

    expect(await screen.findByText("formulario de escucha")).toBeInTheDocument();
    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "recording", id: REC });
    expect(screen.getByText(/^1 · última:/)).toBeInTheDocument();
  });

  it("Favorita alterna el favorito de la grabación", async () => {
    mocks.toggleFavorite.mockResolvedValue({ id: "f1" });
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState()} />);

    fireEvent.click(screen.getByRole("button", { name: song.favorite }));

    await waitFor(() => expect(screen.getByRole("button", { name: song.favorite })).toHaveAttribute("aria-pressed", "true"));
    expect(mocks.toggleFavorite).toHaveBeenCalledWith({ type: "recording", id: REC });
  });

  it("el selector de listas recibe la canción como objetivo", () => {
    renderWithIntl(<SongRelationPanel recordingId={REC} state={makeState()} />);
    fireEvent.click(screen.getByRole("button", { name: relation.chooseLists }));
    expect(screen.getByText("selector de listas de recording")).toBeInTheDocument();
  });
});
