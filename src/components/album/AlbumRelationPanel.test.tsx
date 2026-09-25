import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { AlbumRelationPanel, type AlbumRelationState } from "./AlbumRelationPanel";
import type { CollectionEntry, RatingsResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  createListenEntry: vi.fn(),
  toggleFavorite: vi.fn(),
  toggleWantToListen: vi.fn(),
  saveRating: vi.fn(),
  getRatings: vi.fn(),
  refresh: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: mocks.refresh }),
  useSearchParams: () => mocks.searchParams,
}));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: mocks.createListenEntry }));
vi.mock("@/lib/api/favorites", () => ({ toggleFavorite: mocks.toggleFavorite }));
vi.mock("@/lib/api/want-to-listen", () => ({ toggleWantToListen: mocks.toggleWantToListen }));
vi.mock("@/lib/api/social", () => ({
  saveRating: mocks.saveRating,
  getRatings: mocks.getRatings,
  deleteRating: vi.fn(),
  highlightRating: vi.fn(),
  unhighlightRating: vi.fn(),
}));
vi.mock("@/components/diary/ListenEntryForm", () => ({ ListenEntryForm: () => <div>formulario de escucha</div> }));
vi.mock("@/components/collection/CollectionAlbumAction", () => ({
  CollectionAlbumAction: () => <div>gestión de colección</div>,
}));
vi.mock("@/components/album/AlbumListPicker", () => ({ AlbumListPicker: () => <div>selector de listas</div> }));

const relation = catalogEs.album.relation;
const RG = "550e8400-e29b-41d4-a716-446655440000";
const RATING_ID = "550e8400-e29b-41d4-a716-446655440009";

function ratings(stars: number | null, detailedScore: number | null = null): RatingsResponse {
  return {
    own: stars === null ? null : { id: RATING_ID, stars, detailedScore, createdAt: "", updatedAt: "" },
    aggregate: { count: stars === null ? 0 : 1, averageStars: null, averageDetailedScore: null },
  };
}

function makeState(overrides: Partial<AlbumRelationState> = {}): AlbumRelationState {
  return {
    ratings: ratings(null),
    ownReviewId: null,
    listens: { count: 0, lastAt: null },
    favorited: false,
    pending: false,
    collectionEntries: [],
    wantedEntries: [],
    ownListMemberships: [],
    ...overrides,
  };
}

const vinylEntry = { id: "c1", format: "vinyl" } as CollectionEntry;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.searchParams = new URLSearchParams();
});

describe("AlbumRelationPanel", () => {
  it("a un visitante anónimo le ofrece iniciar sesión, sin controles de escritura", () => {
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={null} />);
    expect(screen.getByText(relation.signInPrompt)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: relation.signIn })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sin interacción muestra todas las filas, sin 'Más acciones' ni 'Ver en listas'", () => {
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState()} />);
    expect(screen.getByText(relation.rating)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(10);
    expect(screen.getByRole("button", { name: relation.detailNeedsStars })).toBeDisabled();
    expect(screen.getByRole("link", { name: relation.writeReview })).toBeInTheDocument();
    expect(screen.getByText(relation.listensNone)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: relation.logListen })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: relation.favorite })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: relation.pending })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(relation.collection)).toBeInTheDocument();
    expect(screen.getByText("En ninguna de tus listas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: relation.chooseLists })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Más acciones|Ver en listas|Agregar a lista/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Tu (nota|reseña)$/)).not.toBeInTheDocument();
  });

  it("con interacción muestra estado: nota, reseña escrita, escuchas, colección y listas", () => {
    renderWithIntl(
      <AlbumRelationPanel
        releaseGroupId={RG}
        state={makeState({
          ratings: ratings(4.5, 91),
          ownReviewId: "review-1",
          listens: { count: 3, lastAt: "2026-09-12T10:00:00.000Z" },
          favorited: true,
          collectionEntries: [vinylEntry],
          ownListMemberships: [
            { listId: "l1", itemId: "i1", kind: "standard", title: "Glam" },
            { listId: "c1", itemId: "i2", kind: "custom_journey", title: "Camino" },
          ],
        })}
      />,
    );
    expect(screen.getByRole("radio", { name: "4,5 estrellas" })).toBeChecked();
    expect(screen.getByRole("button", { name: /Puntuación detallada 91/ })).toHaveTextContent("91");
    expect(screen.getByText(relation.reviewWritten)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: relation.editReview })).toHaveAttribute(
      "href",
      `/album/${RG}/reviews#your-review`,
    );
    expect(screen.getByText(/^3 · última 12 sept?/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: relation.logListen })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: relation.favorite })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Lo tenés · Vinilo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: relation.manageCollection })).toBeInTheDocument();
    expect(screen.getByText("En 2 de tus listas")).toBeInTheDocument();
  });

  it("valorar con un clic guarda las estrellas sin botón Guardar", async () => {
    mocks.saveRating.mockResolvedValue({});
    mocks.getRatings.mockResolvedValue(ratings(3.5));
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState()} />);

    fireEvent.click(screen.getByRole("radio", { name: "3,5 estrellas" }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", RG, { stars: 3.5 }));
    await waitFor(() => expect(screen.getByRole("button", { name: relation.detailAdd })).toBeEnabled());
    expect(screen.getByRole("radio", { name: "3,5 estrellas" })).toBeChecked();
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("al cambiar a estrellas incoherentes con el puntaje lo quita y avisa", async () => {
    mocks.saveRating.mockResolvedValue({});
    mocks.getRatings.mockResolvedValue(ratings(3));
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState({ ratings: ratings(5, 95) })} />);

    fireEvent.click(screen.getByRole("radio", { name: "3,0 estrellas" }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", RG, { stars: 3 }));
    expect(await screen.findByRole("status")).toHaveTextContent("Se quitó tu puntuación 95");
  });

  it("si falla el guardado, las estrellas vuelven al valor anterior y se muestra el error", async () => {
    mocks.saveRating.mockRejectedValue(new Error("red"));
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState({ ratings: ratings(2) })} />);

    fireEvent.click(screen.getByRole("radio", { name: "4,0 estrellas" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(relation.saveError));
    expect(screen.getByRole("radio", { name: "2,0 estrellas" })).toBeChecked();
  });

  it("registrar una escucha suma al conteo, quita Pendiente y ofrece agregar detalles sin abrir el formulario", async () => {
    mocks.createListenEntry.mockResolvedValue({
      id: "entry-1",
      createdAt: "2026-09-20T10:00:00.000Z",
      target: { type: "release-group", id: RG, title: "Álbum" },
      listenContext: "first_listen",
      body: null,
      reaction: null,
      audience: "private",
    });
    renderWithIntl(
      <AlbumRelationPanel
        releaseGroupId={RG}
        state={makeState({ pending: true, listens: { count: 2, lastAt: "2026-09-01T10:00:00.000Z" } })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: relation.logListen }));

    await waitFor(() => expect(screen.getByText(/^3 · última 20 sept?/)).toBeInTheDocument());
    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: RG });
    expect(screen.getByRole("status")).toHaveTextContent(relation.listenLogged);
    expect(screen.queryByText("formulario de escucha")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: relation.pending })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: relation.addDetails }));
    expect(screen.getByText("formulario de escucha")).toBeInTheDocument();
  });

  it("Pendiente es un conmutador: marcarlo lo deja presionado", async () => {
    mocks.toggleWantToListen.mockResolvedValue({ id: "w1" });
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState()} />);
    fireEvent.click(screen.getByRole("button", { name: relation.pending }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: relation.pending })).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("alterna favorito y muestra un error si falla", async () => {
    mocks.toggleFavorite.mockRejectedValueOnce(new Error("red"));
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState()} />);
    fireEvent.click(screen.getByRole("button", { name: relation.favorite }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(relation.saveError));
  });

  it("'Elegir listas' abre el selector", () => {
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState()} />);
    fireEvent.click(screen.getByRole("button", { name: relation.chooseLists }));
    expect(screen.getByText("selector de listas")).toBeInTheDocument();
  });

  it("el deep-link ?collection=have abre la gestión de colección", () => {
    mocks.searchParams = new URLSearchParams("collection=have");
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState()} />);
    expect(screen.getByText("gestión de colección")).toBeInTheDocument();
  });
});
