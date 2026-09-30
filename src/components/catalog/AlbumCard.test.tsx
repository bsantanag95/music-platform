import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { albumHref } from "@/lib/catalog-links";
import catalogEs from "../../../messages/es/catalog.json";
import collectionEs from "../../../messages/es/collection.json";
import listsEs from "../../../messages/es/lists.json";
import { AlbumCard } from "./AlbumCard";
import type { ReleaseGroup } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  addWantedEntries: vi.fn(),
  toggleFavorite: vi.fn(),
  toggleWantToListen: vi.fn(),
  createListenEntry: vi.fn(),
  getReleaseGroupMarks: vi.fn(),
}));

// LazyCoverImage resuelve la carátula en el cliente vía TanStack Query; se
// aísla igual que en AlbumGrid.test.tsx para no necesitar un QueryClient acá.
vi.mock("./LazyCoverImage", () => ({
  LazyCoverImage: () => <div data-testid="mock-cover" />,
}));

vi.mock("./CoverThumb", () => ({
  CoverThumb: ({ cover }: { cover: string | null }) => (
    <div data-testid="cover-thumb" data-cover={cover ?? "none"} />
  ),
}));

// Los paneles de listas cargan datos al montar; se aíslan (sus tests propios los cubren).
vi.mock("@/components/lists/ListsContainingItemPanel", () => ({
  ListsContainingItemPanel: () => <div data-testid="mock-lists-containing" />,
}));
vi.mock("@/components/album/AlbumListPicker", () => ({ AlbumListPicker: () => null }));
vi.mock("@/lib/api/catalog", () => ({ getReleaseGroupMarks: mocks.getReleaseGroupMarks }));
vi.mock("@/lib/api/social", () => ({ saveRating: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/api/wanted", () => ({
  addWantedEntries: mocks.addWantedEntries,
}));

vi.mock("@/lib/api/favorites", () => ({
  toggleFavorite: mocks.toggleFavorite,
}));

vi.mock("@/lib/api/want-to-listen", () => ({
  toggleWantToListen: mocks.toggleWantToListen,
}));

vi.mock("@/lib/api/diary", () => ({
  createListenEntry: mocks.createListenEntry,
}));

const releaseGroup: ReleaseGroup = {
  id: "00000000-0000-4000-8000-0000000000a1",
  mbid: null,
  title: "The Dark Side of the Moon",
  category: "studio",
  firstReleaseDate: null,
  firstReleaseYear: 1973,
  createdAt: "2024-01-01T00:00:00Z",
  coverThumbUrl: null,
  coverResolved: false,
};

describe("AlbumCard — menú de acciones del disco (extend-album-quick-actions)", () => {
  const a = catalogEs.albumActions;
  const MARKS = { listened: false, stars: null, detailedScore: null, favorite: true, pending: false, lists: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getReleaseGroupMarks.mockResolvedValue(MARKS);
  });

  function renderCard(authenticated: boolean) {
    renderWithIntl(<AlbumCard releaseGroup={releaseGroup} categoryLabel="Estudio" coverLabel="Carátula" authenticated={authenticated} />);
    return userEvent.setup();
  }

  async function openMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: a.open.replace("{title}", releaseGroup.title) }));
    return screen.getByRole("dialog", { name: releaseGroup.title });
  }

  it("con sesión pide las marcas y muestra Favorito con su estado", async () => {
    const user = renderCard(true);
    const dialog = await openMenu(user);
    expect(mocks.getReleaseGroupMarks).toHaveBeenCalledWith(releaseGroup.id);
    await waitFor(() => expect(within(dialog).getByRole("button", { name: a.favorite })).toHaveAttribute("aria-pressed", "true"));
  });

  it("conserva Lo busco: agrega el deseo con un clic y muestra el resultado", async () => {
    mocks.addWantedEntries.mockResolvedValue({});
    const user = renderCard(true);
    const dialog = await openMenu(user);
    await user.click(within(dialog).getByRole("button", { name: collectionEs.menuWantIt }));
    expect(mocks.addWantedEntries).toHaveBeenCalledWith({ releaseGroupId: releaseGroup.id, entries: [{}] });
    expect(await screen.findByRole("status")).toHaveTextContent(collectionEs.quickWantedAdded);
  });

  it("conserva Ya la tengo: lleva al flujo de colección del álbum", async () => {
    const user = renderCard(true);
    const dialog = await openMenu(user);
    await user.click(within(dialog).getByRole("button", { name: collectionEs.menuHaveIt }));
    expect(mocks.push).toHaveBeenCalledWith(`${albumHref(null, releaseGroup.title, releaseGroup.id)}?collection=have`);
  });

  it("conserva Ver en listas", async () => {
    const user = renderCard(true);
    const dialog = await openMenu(user);
    await user.click(within(dialog).getByRole("button", { name: listsEs.showInLists }));
    expect(screen.getByTestId("mock-lists-containing")).toBeInTheDocument();
  });

  it("sin sesión no pide marcas; las acciones de colección llevan a iniciar sesión", async () => {
    const user = renderCard(false);
    const dialog = await openMenu(user);
    expect(within(dialog).getByText(a.signInPrompt)).toBeInTheDocument();
    expect(mocks.getReleaseGroupMarks).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: collectionEs.menuWantIt }));
    expect(mocks.push).toHaveBeenCalledWith("/auth/login");
    expect(mocks.addWantedEntries).not.toHaveBeenCalled();
  });
});

// Carátula resuelta (openspec: mirror-cover-art): si la resolución ya tiene
// respuesta se renderiza en la carga inicial sin consultar el endpoint
// cover-only; solo lo no resuelto pasa por LazyCoverImage.
describe("AlbumCard — carátula resuelta", () => {
  beforeEach(() => vi.clearAllMocks());

  it("con URL conocida renderiza CoverThumb sin request", () => {
    renderWithIntl(
      <AlbumCard
        releaseGroup={{
          ...releaseGroup,
          coverResolved: true,
          coverThumbUrl: "https://cdn.example.com/covers/x.webp",
        }}
        categoryLabel="Estudio"
        coverLabel="Carátula"
      />,
    );

    expect(screen.getByTestId("cover-thumb")).toHaveAttribute(
      "data-cover",
      "https://cdn.example.com/covers/x.webp",
    );
    expect(screen.queryByTestId("mock-cover")).not.toBeInTheDocument();
  });

  it("con ausencia confirmada o retirada renderiza el placeholder sin request", () => {
    renderWithIntl(
      <AlbumCard
        releaseGroup={{ ...releaseGroup, coverResolved: true, coverThumbUrl: null }}
        categoryLabel="Estudio"
        coverLabel="Carátula"
      />,
    );

    expect(screen.getByTestId("cover-thumb")).toHaveAttribute("data-cover", "none");
    expect(screen.queryByTestId("mock-cover")).not.toBeInTheDocument();
  });

  it("sin resolver usa LazyCoverImage", () => {
    renderWithIntl(
      <AlbumCard
        releaseGroup={{ ...releaseGroup, coverResolved: false }}
        categoryLabel="Estudio"
        coverLabel="Carátula"
      />,
    );

    expect(screen.getByTestId("mock-cover")).toBeInTheDocument();
    expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
  });
});
