import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { AlbumCard } from "./AlbumCard";
import type { ReleaseGroup } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  addWantedEntries: vi.fn(),
  toggleFavorite: vi.fn(),
  toggleWantToListen: vi.fn(),
  createListenEntry: vi.fn(),
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

// AddToListPanel carga las listas propias al montar (efecto con llamada a la
// API); se aísla para no tener que mockear `@/lib/api/lists` acá — su
// comportamiento propio ya está cubierto por AddToListPanel.test.tsx.
vi.mock("@/components/lists/AddToListPanel", () => ({
  AddToListPanel: () => <div data-testid="mock-add-to-list-panel" />,
}));

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

describe("AlbumCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("agrega una entrada de deseo con un solo click en 'Lo quiero'", async () => {
    const user = userEvent.setup();
    mocks.addWantedEntries.mockResolvedValue([{ id: "w1" }]);
    renderWithIntl(
      <AlbumCard
        releaseGroup={releaseGroup}
        categoryLabel="Estudio"
        coverLabel="Carátula"
        authenticated
      />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Lo quiero" }));

    await waitFor(() =>
      expect(mocks.addWantedEntries).toHaveBeenCalledWith({
        releaseGroupId: releaseGroup.id,
        entries: [{}],
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Agregado a tu lista de deseados");
  });

  it("redirige a login al elegir 'Lo quiero' sin sesión", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <AlbumCard releaseGroup={releaseGroup} categoryLabel="Estudio" coverLabel="Carátula" />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Lo quiero" }));

    expect(mocks.push).toHaveBeenCalledWith("/auth/login");
    expect(mocks.addWantedEntries).not.toHaveBeenCalled();
  });

  it("lleva al flujo 'La tengo' de la página de álbum al elegir 'Ya la tengo'", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <AlbumCard
        releaseGroup={releaseGroup}
        categoryLabel="Estudio"
        coverLabel="Carátula"
        authenticated
      />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Ya la tengo" }));

    expect(mocks.push).toHaveBeenCalledWith(`/album/${releaseGroup.id}?collection=have`);
  });

  it("redirige a login al elegir 'Ya la tengo' sin sesión", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <AlbumCard releaseGroup={releaseGroup} categoryLabel="Estudio" coverLabel="Carátula" />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Ya la tengo" }));

    expect(mocks.push).toHaveBeenCalledWith("/auth/login");
  });

  it("marca como favorito con un solo click en 'Marcar como favorito'", async () => {
    const user = userEvent.setup();
    mocks.toggleFavorite.mockResolvedValue({ id: "fav-1" });
    renderWithIntl(
      <AlbumCard releaseGroup={releaseGroup} categoryLabel="Estudio" coverLabel="Carátula" authenticated />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Marcar como favorito" }));

    await waitFor(() =>
      expect(mocks.toggleFavorite).toHaveBeenCalledWith({ type: "release-group", id: releaseGroup.id }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Agregado a favoritos");
  });

  it("redirige a login al elegir 'Marcar como favorito' sin sesión", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <AlbumCard releaseGroup={releaseGroup} categoryLabel="Estudio" coverLabel="Carátula" />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Marcar como favorito" }));

    expect(mocks.push).toHaveBeenCalledWith("/auth/login");
    expect(mocks.toggleFavorite).not.toHaveBeenCalled();
  });

  it("agrega a Quiero escuchar con un solo click", async () => {
    const user = userEvent.setup();
    mocks.toggleWantToListen.mockResolvedValue({ id: "wtl-1" });
    renderWithIntl(
      <AlbumCard releaseGroup={releaseGroup} categoryLabel="Estudio" coverLabel="Carátula" authenticated />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Quiero escuchar" }));

    await waitFor(() =>
      expect(mocks.toggleWantToListen).toHaveBeenCalledWith({ type: "release-group", id: releaseGroup.id }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Agregado a Quiero escuchar");
  });

  it("registra una escucha con un solo click en 'Registrar escucha'", async () => {
    const user = userEvent.setup();
    mocks.createListenEntry.mockResolvedValue({ id: "listen-1" });
    renderWithIntl(
      <AlbumCard releaseGroup={releaseGroup} categoryLabel="Estudio" coverLabel="Carátula" authenticated />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Registrar escucha" }));

    await waitFor(() =>
      expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: releaseGroup.id }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Escucha registrada");
  });

  it("abre el panel de 'Agregar a lista' al elegirlo con sesión", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <AlbumCard releaseGroup={releaseGroup} categoryLabel="Estudio" coverLabel="Carátula" authenticated />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Agregar elemento" }));

    expect(screen.getByTestId("mock-add-to-list-panel")).toBeInTheDocument();
  });

  it("redirige a login al elegir 'Agregar a lista' sin sesión", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <AlbumCard releaseGroup={releaseGroup} categoryLabel="Estudio" coverLabel="Carátula" />,
    );

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Agregar elemento" }));

    expect(mocks.push).toHaveBeenCalledWith("/auth/login");
    expect(screen.queryByTestId("mock-add-to-list-panel")).not.toBeInTheDocument();
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
