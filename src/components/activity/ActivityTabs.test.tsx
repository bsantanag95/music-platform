import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSyncExternalStore, type ReactElement } from "react";
import { ActivityTabs } from "./ActivityTabs";
import { tabFromParam } from "./activity-tab-param";

// `useSearchParams` sobre un store mínimo que `history.replaceState` actualiza, como hace Next 15 con la API nativa
// del historial.
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

const sectionMock = vi.fn<(props: { source: string; empty?: { title: string } }) => ReactElement>(
  ({ source, empty }) => (
    <div data-testid="panel">
      {source}|{empty?.title}
    </div>
  ),
);
vi.mock("./CommunityActivitySection", () => ({
  CommunityActivitySection: (props: { source: string; empty?: { title: string } }) => sectionMock(props),
  activityQueryOptions: (source: string) => ({
    queryKey: ["activity-test", source],
    queryFn: () => Promise.resolve({ entries: [], page: 1, pageSize: 10, hasNext: false }),
    initialPageParam: 1,
    getNextPageParam: () => undefined,
  }),
}));

const emptyPage = { entries: [], page: 1, pageSize: 10, hasNext: false };
const empty = (title: string) => ({ title, description: "d" });
const tabs = [
  { key: "recent" as const, label: "Recientes", initial: emptyPage, empty: empty("vacío-recientes") },
  { key: "from-following" as const, label: "Siguiendo", empty: empty("vacío-siguiendo") },
  { key: "own" as const, label: "Tú", empty: empty("vacío-tú") },
];

function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ActivityTabs", () => {
  beforeEach(() => {
    urlStore.set("");
    vi.spyOn(window.history, "replaceState").mockImplementation((_data, _unused, url) => {
      urlStore.set(new URL(String(url), "http://localhost").search.replace(/^\?/, ""));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sin ?tab= arranca en Recientes y monta solo su panel", () => {
    render(<ActivityTabs tabs={tabs} tablistLabel="Secciones de actividad" />);

    expect(screen.getByTestId("panel")).toHaveTextContent("recent|vacío-recientes");
    expect(screen.getByRole("tab", { name: "Recientes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tú" })).toHaveAttribute("aria-selected", "false");
  });

  it("arranca en la pestaña que indica la URL", () => {
    urlStore.set("tab=you");
    render(<ActivityTabs tabs={tabs} tablistLabel="Secciones de actividad" />);

    expect(screen.getByRole("tab", { name: "Tú" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("panel")).toHaveTextContent("own|vacío-tú");
  });

  it("hacer click en otra pestaña la escribe en la URL sin apilar historial y cambia el panel", async () => {
    const user = userEvent.setup();
    render(<ActivityTabs tabs={tabs} tablistLabel="Secciones de actividad" />);

    await user.click(screen.getByRole("tab", { name: "Siguiendo" }));

    expect(window.history.replaceState).toHaveBeenCalledWith(null, "", expect.stringContaining("?tab=following"));
    expect(screen.getByTestId("panel")).toHaveTextContent("from-following");
    expect(screen.getByRole("tab", { name: "Siguiendo" })).toHaveAttribute("aria-selected", "true");
  });

  it("volver a Recientes quita el parámetro y conserva los demás", async () => {
    urlStore.set("tab=you&otro=1");
    const user = userEvent.setup();
    render(<ActivityTabs tabs={tabs} tablistLabel="Secciones de actividad" />);

    await user.click(screen.getByRole("tab", { name: "Recientes" }));

    expect(urlStore.get()).toBe("otro=1");
    expect(screen.getByTestId("panel")).toHaveTextContent("recent");
  });

  it("cambiar de pestaña quita el filtro de tipo: cada pestaña ofrece sus propios tipos", async () => {
    urlStore.set("kind=listen&tab=following");
    const user = userEvent.setup();
    render(<ActivityTabs tabs={tabs} tablistLabel="Secciones de actividad" />);

    await user.click(screen.getByRole("tab", { name: "Recientes" }));

    expect(urlStore.get()).toBe("");
  });

  it("la flecha derecha del teclado avanza a la siguiente pestaña", async () => {
    const user = userEvent.setup();
    render(<ActivityTabs tabs={tabs} tablistLabel="Secciones de actividad" />);

    screen.getByRole("tab", { name: "Recientes" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByTestId("panel")).toHaveTextContent("from-following");
    expect(screen.getByRole("tab", { name: "Siguiendo" })).toHaveFocus();
  });
});

describe("tabFromParam", () => {
  it("traduce los valores conocidos y cae a Recientes con cualquier otro", () => {
    expect(tabFromParam("following")).toBe("from-following");
    expect(tabFromParam("you")).toBe("own");
    expect(tabFromParam("otra")).toBe("recent");
    expect(tabFromParam(null)).toBe("recent");
  });
});
