import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { ArtistRelationPanel, type ArtistRelationState } from "./ArtistRelationPanel";

const mocks = vi.hoisted(() => ({
  followArtist: vi.fn(),
  unfollowArtist: vi.fn(),
  createListenEntry: vi.fn(),
  toggleFavorite: vi.fn(),
  toggleWantToListen: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: mocks.refresh }),
}));
vi.mock("@/lib/api/catalog", () => ({ followArtist: mocks.followArtist, unfollowArtist: mocks.unfollowArtist }));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: mocks.createListenEntry }));
vi.mock("@/lib/api/favorites", () => ({ toggleFavorite: mocks.toggleFavorite }));
vi.mock("@/lib/api/want-to-listen", () => ({ toggleWantToListen: mocks.toggleWantToListen }));
vi.mock("@/components/diary/ListenEntryForm", () => ({ ListenEntryForm: () => <div>formulario de escucha</div> }));
vi.mock("@/components/album/AlbumListPicker", () => ({ AlbumListPicker: () => <div>selector de listas</div> }));
vi.mock("@/components/artist-journey/ArtistJourneyStartModal", () => ({
  ArtistJourneyStartModal: () => <div role="dialog">modal de inicio del recorrido</div>,
}));

const relation = catalogEs.artist.relation;
const ARTIST = "550e8400-e29b-41d4-a716-446655440000";
const categoryLabels = { studio: "Estudio", single_ep: "Sencillos", compilation: "Recopilatorios", live_other: "En vivo" };

function makeState(overrides: Partial<ArtistRelationState> = {}): ArtistRelationState {
  return {
    following: false,
    favorited: false,
    pending: false,
    listens: { albumCount: 0, last: null },
    collection: { have: 0, seeking: 0 },
    ownListMemberships: [],
    journey: null,
    ...overrides,
  };
}

function renderPanel(state: ArtistRelationState | null) {
  return renderWithIntl(
    <ArtistRelationPanel artistId={ARTIST} artistName="Pink Floyd" state={state} journeyAlbums={[]} categoryLabels={categoryLabels} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ArtistRelationPanel", () => {
  it("anónimo: invitación a iniciar sesión, sin controles de escritura", () => {
    renderPanel(null);
    expect(screen.getByText(relation.signInPrompt)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: relation.signIn })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("primera visita: las siete filas sin menú, sin estrellas ni reseña", () => {
    renderPanel(makeState());
    const panel = screen.getByRole("complementary", { name: relation.heading });
    for (const label of [relation.follow, relation.favorite, relation.pending]) {
      expect(within(panel).getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "false");
    }
    for (const label of [relation.listens, relation.collection, relation.journey]) {
      expect(within(panel).getByText(label)).toBeInTheDocument();
    }
    expect(within(panel).getByText("En ninguna de tus listas")).toBeInTheDocument();
    expect(within(panel).queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(within(panel).queryByText(/reseña/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText("···")).not.toBeInTheDocument();
  });

  it("seguir alterna el conmutador y no muestra ninguna cifra de seguidores", async () => {
    mocks.followArtist.mockResolvedValue(undefined);
    renderPanel(makeState());
    fireEvent.click(screen.getByRole("button", { name: relation.follow }));
    await waitFor(() => expect(screen.getByRole("button", { name: relation.following })).toHaveAttribute("aria-pressed", "true"));
    expect(mocks.followArtist).toHaveBeenCalledWith(ARTIST);
    expect(screen.getByRole("button", { name: relation.following }).textContent).not.toMatch(/\d/);
  });

  it("Escuchas: discos distintos y el último con fecha relativa, nunca el total de la discografía", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    renderPanel(makeState({ listens: { albumCount: 7, last: { title: "Animals", at: threeDaysAgo } } }));
    const summary = screen.getByText(/7 discos/);
    expect(summary.textContent).toMatch(/^7 discos · Animals, hace 3 días$/);
    expect(summary.textContent).not.toMatch(/ de \d/);
  });

  it("Escuchas solo del artista: muestra la fecha de la última", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    renderPanel(makeState({ listens: { albumCount: 0, last: { title: null, at: yesterday } } }));
    expect(screen.getByText("hace 1 día")).toBeInTheDocument();
  });

  it("registrar una escucha del artista retira Pendiente", async () => {
    mocks.createListenEntry.mockResolvedValue({ id: "e1", createdAt: new Date().toISOString(), target: { type: "artist", id: ARTIST } });
    renderPanel(makeState({ pending: true }));
    fireEvent.click(screen.getByRole("button", { name: relation.logListen }));
    await waitFor(() => expect(screen.getByText(relation.listenLogged, { exact: false })).toBeInTheDocument());
    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "artist", id: ARTIST });
    expect(screen.getByRole("button", { name: relation.pending })).toHaveAttribute("aria-pressed", "false");
  });

  it("Colección en solo lectura: discos en colección y en búsqueda", () => {
    renderPanel(makeState({ collection: { have: 3, seeking: 1 } }));
    expect(screen.getByText("3 discos · buscas 1")).toBeInTheDocument();
  });

  it("Recorrido en curso: barra discreta sin cifras y enlace a la gestión", () => {
    renderPanel(makeState({ journey: { state: "in_progress", progress: 0.6 } }));
    const bar = screen.getByRole("progressbar", { name: relation.journeyProgress });
    expect(bar).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByText(relation.journeyStates.in_progress)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(relation.journeyManage) })).toHaveAttribute("href", `/me/artist-journeys/${ARTIST}`);
    expect(screen.queryByText(/\d+ de \d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/60/)).not.toBeInTheDocument();
  });

  it("sin recorrido, 'Armar recorrido' abre el modal de inicio", () => {
    renderPanel(makeState());
    fireEvent.click(screen.getByRole("button", { name: relation.journeyStart }));
    expect(screen.getByRole("dialog")).toHaveTextContent("modal de inicio del recorrido");
  });

  it("Listas abre el selector con casillas", () => {
    renderPanel(makeState({ ownListMemberships: [{ listId: "l1", itemId: "i1", kind: "standard", title: "Favoritas" }] }));
    expect(screen.getByText("En 1 de tus listas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: relation.chooseLists }));
    expect(screen.getByText("selector de listas")).toBeInTheDocument();
  });
});
