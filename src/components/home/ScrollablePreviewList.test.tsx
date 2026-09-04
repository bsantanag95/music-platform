import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { ScrollablePreviewList } from "./ScrollablePreviewList";
import { renderWithIntl } from "@/test/i18n-test-utils";
import * as diaryApi from "@/lib/api/diary";
import * as homeApi from "@/lib/api/home";
import type { FeedEntry } from "@/lib/api/schemas";

vi.mock("@/lib/api/diary", () => ({ getFeed: vi.fn() }));
vi.mock("@/lib/api/home", () => ({ getRecentActivity: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ label }: { label: string }) => <span data-testid="cover-thumb">{label}</span>,
}));

// El sentinel de carga incremental se observa con IntersectionObserver: el
// stub global de src/test/setup.ts no dispara nada, así que estos tests lo
// reemplazan por uno que expone el callback para simular la intersección.
let observedCallback: IntersectionObserverCallback | null = null;
class CapturingIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(callback: IntersectionObserverCallback) {
    observedCallback = callback;
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

function intersect() {
  observedCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
}

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// Sin anotar el retorno como FeedEntry (la unión ancha): así el tipo inferido
// (literal `kind: "listen"`) es asignable tanto a FeedEntry[] (mock de
// getFeed) como a RecentActivityEntry[] (mock de getRecentActivity, unión
// más angosta que no incluye favorite/list).
function listen(id: string, title: string) {
  return {
    kind: "listen",
    id,
    listenContext: "first_listen",
    body: null,
    reaction: null,
    audience: "public",
    createdAt: "2026-08-01T00:00:00Z",
    target: { type: "recording", id: `t-${id}`, title, subtitle: null, artistName: null, coverThumbUrl: null },
    author: { id: "u1", username: "fran", displayName: "Fran" },
  } satisfies FeedEntry;
}

describe("ScrollablePreviewList", () => {
  const originalIO = globalThis.IntersectionObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    observedCallback = null;
    globalThis.IntersectionObserver = CapturingIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIO;
  });

  it("muestra la página inicial sin pedir datos al servidor", () => {
    renderWithQuery(
      <ScrollablePreviewList source="feed" initialEntries={[listen("l1", "Tears")]} initialHasNext={false} />,
    );

    expect(screen.getByText("Tears")).toBeInTheDocument();
    expect(diaryApi.getFeed).not.toHaveBeenCalled();
  });

  it("carga la página siguiente al intersectar el sentinel y la agrega a la lista", async () => {
    vi.mocked(diaryApi.getFeed).mockResolvedValue({
      entries: [listen("l2", "Currents")],
      page: 2,
      pageSize: 10,
      hasNext: false,
    });

    renderWithQuery(
      <ScrollablePreviewList source="feed" initialEntries={[listen("l1", "Tears")]} initialHasNext={true} />,
    );

    expect(screen.getByText("Tears")).toBeInTheDocument();
    intersect();

    await waitFor(() => expect(screen.getByText("Currents")).toBeInTheDocument());
    expect(diaryApi.getFeed).toHaveBeenCalledWith(2, 10);
    expect(screen.getByText("Tears")).toBeInTheDocument();
  });

  it("no vuelve a pedir más cuando ya no hay siguiente página", () => {
    renderWithQuery(
      <ScrollablePreviewList source="self" initialEntries={[listen("l1", "Tears")]} initialHasNext={false} />,
    );

    expect(observedCallback).toBeNull();
    expect(homeApi.getRecentActivity).not.toHaveBeenCalled();
  });

  it("usa getRecentActivity para el rastro propio (source=self)", async () => {
    vi.mocked(homeApi.getRecentActivity).mockResolvedValue({
      entries: [listen("l2", "Currents")],
      page: 2,
      pageSize: 10,
      hasNext: false,
    });

    renderWithQuery(
      <ScrollablePreviewList source="self" initialEntries={[listen("l1", "Tears")]} initialHasNext={true} />,
    );

    intersect();

    await waitFor(() => expect(homeApi.getRecentActivity).toHaveBeenCalledWith(2, 10));
    expect(diaryApi.getFeed).not.toHaveBeenCalled();
  });
});
