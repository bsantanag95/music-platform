import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { AlbumCard } from "./AlbumCard";
import type { ReleaseGroup } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  addWantedEntries: vi.fn(),
}));

// LazyCoverImage resuelve la carátula en el cliente vía TanStack Query; se
// aísla igual que en AlbumGrid.test.tsx para no necesitar un QueryClient acá.
vi.mock("./LazyCoverImage", () => ({
  LazyCoverImage: () => <div data-testid="mock-cover" />,
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

const releaseGroup: ReleaseGroup = {
  id: "00000000-0000-4000-8000-0000000000a1",
  mbid: null,
  title: "The Dark Side of the Moon",
  category: "studio",
  firstReleaseDate: null,
  firstReleaseYear: 1973,
  createdAt: "2024-01-01T00:00:00Z",
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
});
