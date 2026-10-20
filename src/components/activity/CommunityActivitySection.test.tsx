import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSyncExternalStore, type AnchorHTMLAttributes, type ReactElement, type ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CommunityActivitySection } from "./CommunityActivitySection";

// `useSearchParams` sobre un store mínimo que `history.replaceState` actualiza, como hace Next 15.
const urlStore = vi.hoisted(() => {
  let search = "";
  const listeners = new Set<() => void>();
  return {
    get: () => search,
    set: (next: string) => {
      search = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(useSyncExternalStore(urlStore.subscribe, urlStore.get, urlStore.get)),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/api/diary", () => ({
  getFeed: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
  getCommunityActivity: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
}));
vi.mock("@/lib/api/home", () => ({
  getRecentActivity: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
}));

const feedActivityListMock = vi.fn<(props: unknown) => ReactElement>(() => (
  <div data-testid="feed-activity-list" />
));
vi.mock("@/components/feed/FeedActivityList", () => ({
  FeedActivityList: (props: unknown) => feedActivityListMock(props),
}));

const entry = {
  kind: "rating" as const,
  id: "e1",
  stars: "4.5",
  detailedScore: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "release-group" as const, id: "a1", title: "Album", coverThumbUrl: null },
  author: { id: "u1", username: "ana", displayName: "Ana" },
};

function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("CommunityActivitySection", () => {
  beforeEach(() => {
    urlStore.set("");
    vi.spyOn(window.history, "replaceState").mockImplementation((_data, _unused, url) => {
      urlStore.set(new URL(String(url), "http://localhost").search.replace(/^\?/, ""));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("'Siguiendo' pasa clamp y variant=feed a FeedActivityList, igual que /me/feed", () => {
    render(
      <CommunityActivitySection source="from-following" initial={{ entries: [entry], page: 1, pageSize: 20, hasNext: false }} />,
    );

    expect(screen.getByTestId("feed-activity-list")).toBeInTheDocument();
    expect(feedActivityListMock).toHaveBeenCalledWith(
      expect.objectContaining({ clamp: true, variant: "feed" }),
    );
  });

  it("'Tú' pasa clamp y variant=own a FeedActivityList: la anatomía con carátula de las otras pestañas, sin autor", () => {
    render(<CommunityActivitySection source="own" initial={{ entries: [entry], page: 1, pageSize: 10, hasNext: false }} />);

    expect(screen.getByTestId("feed-activity-list")).toBeInTheDocument();
    expect(feedActivityListMock).toHaveBeenCalledWith(
      expect.objectContaining({ clamp: true, variant: "own" }),
    );
  });

  it("'Recientes' usa la misma presentación del feed que las otras pestañas (variant=feed, clamp)", () => {
    render(<CommunityActivitySection source="recent" initial={{ entries: [entry], page: 1, pageSize: 10, hasNext: false }} />);

    expect(screen.getByTestId("feed-activity-list")).toBeInTheDocument();
    expect(feedActivityListMock).toHaveBeenCalledWith(
      expect.objectContaining({ clamp: true, variant: "feed" }),
    );
  });

  it("sin sesión (headingKey) y sin entradas, no renderiza nada", () => {
    const { container } = render(
      <CommunityActivitySection
        source="recent"
        headingKey="community.recentHeading"
        initial={{ entries: [], page: 1, pageSize: 10, hasNext: false }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("dentro de pestañas, una fuente sin entradas muestra su estado vacío con la acción", () => {
    render(
      <CommunityActivitySection
        source="from-following"
        initial={{ entries: [], page: 1, pageSize: 10, hasNext: false }}
        empty={{
          title: "Aún no sigues a nadie",
          description: "Aquí verás lo que valoran las personas que sigues.",
          action: { label: "Descubrir personas", href: "/users" },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Aún no sigues a nadie" })).toBeInTheDocument();
    expect(screen.getByText("Aquí verás lo que valoran las personas que sigues.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Descubrir personas" })).toHaveAttribute("href", "/users");
    expect(screen.queryByTestId("feed-activity-list")).not.toBeInTheDocument();
  });

  it("sin página inicial del servidor muestra un esqueleto y luego pide la página 1 a su endpoint", async () => {
    const { getRecentActivity } = await import("@/lib/api/home");
    vi.mocked(getRecentActivity).mockResolvedValueOnce({ entries: [entry], page: 1, pageSize: 10, hasNext: false });

    render(<CommunityActivitySection source="own" empty={{ title: "Vacío", description: "d" }} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await screen.findByTestId("feed-activity-list")).toBeInTheDocument();
    expect(getRecentActivity).toHaveBeenCalledWith(1, 10);
  });

  describe("filtros por tipo (redesign-activity-page, fase 2)", () => {
    const one = { entries: [entry], page: 1, pageSize: 10, hasNext: false };

    it("'Recientes' ofrece Todo, Reseñas, Comentarios y Valoraciones, con Todo seleccionado", () => {
      render(<CommunityActivitySection source="recent" initial={one} />);

      const group = screen.getByRole("group", { name: "Filtrar por tipo" });
      const chips = [...group.querySelectorAll("button")];
      expect(chips.map((chip) => chip.textContent)).toEqual(["Todo", "Reseñas", "Comentarios", "Valoraciones"]);
      expect(screen.getByRole("button", { name: "Todo" })).toHaveAttribute("aria-pressed", "true");
    });

    it("'Siguiendo' suma Escuchas y Listas; 'Tú' no muestra chips", () => {
      const { unmount } = render(<CommunityActivitySection source="from-following" initial={one} />);
      expect(screen.getByRole("button", { name: "Escuchas" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Listas" })).toBeInTheDocument();
      unmount();

      render(<CommunityActivitySection source="own" initial={one} />);
      expect(screen.queryByRole("group", { name: "Filtrar por tipo" })).not.toBeInTheDocument();
    });

    it("elegir un chip lo escribe en ?kind= y pide la página 1 filtrada", async () => {
      const { getCommunityActivity } = await import("@/lib/api/diary");
      const user = userEvent.setup();
      render(<CommunityActivitySection source="recent" initial={one} />);

      await user.click(screen.getByRole("button", { name: "Reseñas" }));

      expect(urlStore.get()).toBe("kind=review");
      expect(screen.getByRole("button", { name: "Reseñas" })).toHaveAttribute("aria-pressed", "true");
      expect(getCommunityActivity).toHaveBeenCalledWith(1, 10, { kind: "review" });
    });

    it("la página del servidor no se usa para otro filtro", () => {
      urlStore.set("kind=comment");
      render(<CommunityActivitySection source="recent" initial={one} />);

      // `initial` vino sin filtro: con ?kind=comment se espera la página filtrada, no se muestra la otra.
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.queryByTestId("feed-activity-list")).not.toBeInTheDocument();
    });

    it("un filtro sin resultados ofrece 'Ver todo', que quita el filtro", async () => {
      urlStore.set("kind=comment");
      const user = userEvent.setup();
      render(
        <CommunityActivitySection
          source="recent"
          initial={{ entries: [], page: 1, pageSize: 10, hasNext: false }}
          initialKind="comment"
        />,
      );

      expect(screen.getByRole("heading", { name: "Nada de este tipo por ahora" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Ver todo" }));

      // Sin filtro vuelve a pedir la página 1 completa de la fuente.
      expect(urlStore.get()).toBe("");
      const { getCommunityActivity } = await import("@/lib/api/diary");
      expect(getCommunityActivity).toHaveBeenCalledWith(1, 10, {});
    });

    it("un kind que no aplica a la pestaña se ignora", () => {
      urlStore.set("kind=listen");
      render(<CommunityActivitySection source="recent" initial={one} />);

      expect(screen.getByRole("button", { name: "Todo" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("feed-activity-list")).toBeInTheDocument();
    });
  });
});
