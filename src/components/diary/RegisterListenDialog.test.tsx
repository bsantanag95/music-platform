import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { RegisterListenDialog } from "./RegisterListenDialog";
import { ApiError } from "@/lib/api/client";

const mocks = vi.hoisted(() => ({ searchCatalog: vi.fn(), createListenEntry: vi.fn() }));

vi.mock("@/lib/api/catalog", () => ({ searchCatalog: mocks.searchCatalog }));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: mocks.createListenEntry }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => null }));
vi.mock("./ListenEntryForm", () => ({
  ListenEntryForm: ({ entryId }: { entryId: string }) => (
    <div data-testid="expand-form">{entryId}</div>
  ),
}));

const albumId = "a1b2c3d4-0000-4000-8000-000000000010";

// El diálogo no usa react-query (el Header vive fuera de `<Providers>`), así que
// no hace falta un `QueryClientProvider`.
function render(ui: ReactElement) {
  return renderWithIntl(ui);
}

const searchResponse = {
  results: [
    {
      kind: "release-group" as const,
      id: albumId,
      mbid: null,
      name: "The Dark Side of the Moon",
      subtitle: "Pink Floyd",
      artistType: null,
      category: "studio" as const,
      year: 1973,
      cached: true,
    },
  ],
};

const createdEntry = {
  id: "a1b2c3d4-0000-4000-8000-000000000020",
  listenContext: "first_listen" as const,
  body: null,
  reaction: null,
  audience: "private" as const,
  createdAt: "2026-01-01",
  target: { type: "release-group", id: albumId, title: "The Dark Side of the Moon", subtitle: null, coverThumbUrl: null },
};

describe("RegisterListenDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca, elige un álbum, crea la escucha y ofrece ampliarla", async () => {
    mocks.searchCatalog.mockResolvedValue(searchResponse);
    mocks.createListenEntry.mockResolvedValue(createdEntry);
    render(<RegisterListenDialog onClose={() => {}} />);

    await userEvent.type(screen.getByRole("searchbox"), "dark side");
    await waitFor(() => expect(mocks.searchCatalog).toHaveBeenCalledWith("dark side"), {
      timeout: 1500,
    });

    const option = await screen.findByRole("button", { name: /The Dark Side of the Moon/ });
    await userEvent.click(option);

    expect(mocks.createListenEntry).toHaveBeenCalledWith({
      type: "release-group",
      id: albumId,
    });
    expect(await screen.findByTestId("expand-form")).toHaveTextContent(createdEntry.id);
  });

  it("con 401 muestra el enlace para iniciar sesión", async () => {
    mocks.searchCatalog.mockResolvedValue(searchResponse);
    mocks.createListenEntry.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    render(<RegisterListenDialog onClose={() => {}} />);

    await userEvent.type(screen.getByRole("searchbox"), "dark side");
    const option = await screen.findByRole("button", { name: /The Dark Side of the Moon/ });
    await userEvent.click(option);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Iniciar sesión/ })).toHaveAttribute(
        "href",
        "/auth/login",
      ),
    );
  });

  it("Escape cierra el modal", async () => {
    mocks.searchCatalog.mockResolvedValue({ results: [] });
    const onClose = vi.fn();
    render(<RegisterListenDialog onClose={onClose} />);

    // El listener se ata tras montar el portal.
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
