import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { WantToListenList } from "./WantToListenList";
import type { WantToListenEntry, WantToListenListResponse } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const mocks = vi.hoisted(() => ({
  getMyWantToListen: vi.fn(),
  removeFromWantToListen: vi.fn(),
}));

vi.mock("@/lib/api/want-to-listen", () => ({
  getMyWantToListen: mocks.getMyWantToListen,
  removeFromWantToListen: mocks.removeFromWantToListen,
}));

function installStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    },
  });
}

const artistEntry: WantToListenEntry = {
  id: "e1",
  targetType: "artist",
  createdAt: "2026-01-02T00:00:00Z",
  target: { id: "a1", title: "Pink Floyd", coverThumbUrl: null },
};

const albumEntry: WantToListenEntry = {
  id: "e2",
  targetType: "release-group",
  createdAt: "2026-01-01T00:00:00Z",
  target: { id: "rg1", title: "The Dark Side of the Moon", coverThumbUrl: null },
};

const initial: WantToListenListResponse = {
  items: [artistEntry, albumEntry],
  page: 1,
  pageSize: 20,
  hasNext: false,
};

describe("WantToListenList", () => {
  beforeEach(() => {
    installStorage();
    vi.clearAllMocks();
  });

  it("separa artistas y álbumes en secciones propias", () => {
    renderWithIntl(<WantToListenList initial={initial} />);
    expect(screen.getByRole("heading", { name: "Artistas (1)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Álbumes (1)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pink Floyd" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
  });

  it("arranca en modo Detallada y cambia a Índice y Gráfico", async () => {
    renderWithIntl(<WantToListenList initial={initial} />);
    expect(screen.getByRole("radio", { name: "Detallada", checked: true })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Índice" }));
    expect(screen.getByRole("radio", { name: "Índice", checked: true })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Gráfico" }));
    expect(screen.getByRole("radio", { name: "Gráfico", checked: true })).toBeInTheDocument();
  });

  it("quita una entrada en dos pasos y la retira de su sección", async () => {
    mocks.removeFromWantToListen.mockResolvedValue(null);
    renderWithIntl(<WantToListenList initial={initial} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar Pink Floyd de la lista" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar remoción" }));

    expect(mocks.removeFromWantToListen).toHaveBeenCalledWith({ type: "artist", id: "a1" });
    expect(screen.queryByRole("heading", { name: /Artistas/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Álbumes (1)" })).toBeInTheDocument();
  });

  it("estado vacío cuando no hay entradas", () => {
    renderWithIntl(
      <WantToListenList initial={{ items: [], page: 1, pageSize: 20, hasNext: false }} />,
    );
    expect(screen.getByText("Todavía no agregaste nada")).toBeInTheDocument();
  });
});
