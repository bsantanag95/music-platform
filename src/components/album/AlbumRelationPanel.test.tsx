import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { AlbumRelationPanel, type AlbumRelationState } from "./AlbumRelationPanel";
import type { CollectionEntry } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  createListenEntry: vi.fn(),
  toggleFavorite: vi.fn(),
  toggleWantToListen: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => mocks.searchParams,
}));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: mocks.createListenEntry }));
vi.mock("@/lib/api/favorites", () => ({ toggleFavorite: mocks.toggleFavorite }));
vi.mock("@/lib/api/want-to-listen", () => ({ toggleWantToListen: mocks.toggleWantToListen }));
vi.mock("@/components/diary/ListenEntryForm", () => ({ ListenEntryForm: () => <div>formulario de escucha</div> }));
vi.mock("@/components/collection/CollectionAlbumAction", () => ({
  CollectionAlbumAction: () => <div>gestión de colección</div>,
}));
vi.mock("@/components/lists/AddToListPanel", () => ({ AddToListPanel: () => <div>panel de listas</div> }));
vi.mock("@/components/lists/ListsContainingItemPanel", () => ({ ListsContainingItemPanel: () => <div>listas</div> }));

const relation = catalogEs.album.relation;
const RG = "550e8400-e29b-41d4-a716-446655440000";

function makeState(overrides: Partial<AlbumRelationState> = {}): AlbumRelationState {
  return {
    ratings: { own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } },
    ownReviewId: null,
    listens: { count: 0, lastAt: null },
    favorited: false,
    pending: false,
    collectionEntries: [],
    wantedEntries: [],
    ownListCount: 0,
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

  it("sin interacción muestra las acciones mínimas y deja colección y listas en 'Más acciones'", () => {
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState()} />);
    expect(screen.getByRole("button", { name: relation.rate })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: relation.logListen })).toBeInTheDocument();
    expect(screen.getByText(relation.pending)).toBeInTheDocument();
    expect(screen.queryByText(relation.collection)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: relation.more }));
    expect(screen.getByText(relation.collection)).toBeInTheDocument();
    expect(screen.getByText("En ninguna de tus listas")).toBeInTheDocument();
  });

  it("con interacción muestra estado: nota, reseña, escuchas con la última fecha, colección y listas", () => {
    renderWithIntl(
      <AlbumRelationPanel
        releaseGroupId={RG}
        state={makeState({
          ratings: {
            own: { id: "550e8400-e29b-41d4-a716-446655440009", stars: 4.5, detailedScore: 91, createdAt: "", updatedAt: "" },
            aggregate: { count: 1, averageStars: 4.5, averageDetailedScore: 91 },
          },
          ownReviewId: "review-1",
          listens: { count: 3, lastAt: "2026-09-12T10:00:00.000Z" },
          collectionEntries: [vinylEntry],
          ownListCount: 2,
        })}
      />,
    );
    expect(screen.getByText("★ 4.5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: relation.editReview })).toHaveAttribute(
      "href",
      `/album/${RG}/reviews#your-review`,
    );
    expect(screen.getByText("3 escuchas")).toBeInTheDocument();
    expect(screen.getByText(/Última: 12 sept?/)).toBeInTheDocument();
    expect(screen.getByText("Lo tenés · Vinilo")).toBeInTheDocument();
    expect(screen.getByText("En 2 de tus listas")).toBeInTheDocument();
  });

  it("registrar una escucha suma al conteo y quita el álbum de Pendiente", async () => {
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
      <AlbumRelationPanel releaseGroupId={RG} state={makeState({ pending: true, listens: { count: 1, lastAt: null } })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: relation.logAnother }));

    await waitFor(() => expect(screen.getByText("2 escuchas")).toBeInTheDocument());
    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: RG });
    expect(screen.getByText("formulario de escucha")).toBeInTheDocument();
  });

  it("alterna favorito y muestra un error si falla", async () => {
    mocks.toggleFavorite.mockRejectedValueOnce(new Error("red"));
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState()} />);
    const buttons = screen.getAllByRole("button", { name: relation.add });
    fireEvent.click(buttons[0]!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(relation.saveError));
  });

  it("el deep-link ?collection=have abre la gestión de colección", () => {
    mocks.searchParams = new URLSearchParams("collection=have");
    renderWithIntl(<AlbumRelationPanel releaseGroupId={RG} state={makeState()} />);
    expect(screen.getByText("gestión de colección")).toBeInTheDocument();
  });
});
