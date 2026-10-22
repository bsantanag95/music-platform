import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { DiaryListResponse, ListenEntry, WantToListenEntry } from "@/lib/api/schemas";
import { DiaryBridgeProvider } from "./DiaryBridge";
import { DiaryActivityList } from "./DiaryActivityList";
import { DiaryContextRail } from "./DiaryContextRail";

const mocks = vi.hoisted(() => ({
  getMyDiary: vi.fn(),
  getMyDiaryMonths: vi.fn(),
  createListenEntry: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));
vi.mock("@/lib/api/diary", () => ({
  getMyDiary: mocks.getMyDiary,
  getMyDiaryMonths: mocks.getMyDiaryMonths,
  createListenEntry: mocks.createListenEntry,
  updateListenEntry: vi.fn(),
  deleteListenEntry: vi.fn(),
  highlightListenEntry: vi.fn(),
  unhighlightListenEntry: vi.fn(),
}));

const entry: ListenEntry = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  listenContext: "first_listen",
  body: null,
  reaction: null,
  audience: "private",
  createdAt: "2026-09-15T12:00:00.000Z",
  target: { type: "release-group", id: "a1b2c3d4-0000-4000-8000-000000000002", title: "Kid A", subtitle: null, coverThumbUrl: null },
};
const initial: DiaryListResponse = { entries: [entry], page: 1, pageSize: 20, hasNext: false };

const wanted: WantToListenEntry[] = [
  {
    id: "a1b2c3d4-0000-4000-8000-0000000000a1",
    targetType: "release-group",
    createdAt: "2026-10-01T00:00:00.000Z",
    target: { id: "a1b2c3d4-0000-4000-8000-0000000000b1", title: "Dr. Feelgood", coverThumbUrl: null, artistName: "Mötley Crüe", artistId: null },
  },
  {
    id: "a1b2c3d4-0000-4000-8000-0000000000a2",
    targetType: "artist",
    createdAt: "2026-09-01T00:00:00.000Z",
    target: { id: "a1b2c3d4-0000-4000-8000-0000000000b2", title: "Ratt", coverThumbUrl: null, artistName: null, artistId: null },
  },
];

function renderDiary(toLog: WantToListenEntry[] = wanted) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={queryClient}>
      <DiaryBridgeProvider>
        <DiaryActivityList initial={initial} />
        <DiaryContextRail toLog={toLog} profileDiaryHref="/users/ana/diary" />
      </DiaryBridgeProvider>
    </QueryClientProvider>,
  );
}

describe("DiaryContextRail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/es/me/diary");
    mocks.getMyDiaryMonths.mockResolvedValue({
      months: [
        { year: 2026, month: 9 },
        { year: 2026, month: 1 },
        { year: 2025, month: 12 },
      ],
    });
    mocks.getMyDiary.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
  });

  it("«Ir a» lista años y meses con escuchas, sin conteos", async () => {
    renderDiary();
    const rail = screen.getByRole("complementary", { name: "Contexto del diario" });
    const goTo = (await within(rail).findByRole("heading", { name: "Ir a" })).parentElement as HTMLElement;
    await waitFor(() => expect(within(goTo).getByRole("button", { name: "2025" })).toBeInTheDocument());
    const labels = within(goTo)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(labels).toEqual(["Todo el diario", "2026", "sept", "ene", "2025", "dic"]);
    // ningún módulo resume volumen
    expect(rail.textContent).not.toMatch(/\(\d+\)|\d+\s*(escuchas?|entradas?)/i);
  });

  it("un atajo aplica el filtro de fecha de la lista y queda marcado", async () => {
    const user = userEvent.setup();
    renderDiary();
    const rail = screen.getByRole("complementary", { name: "Contexto del diario" });
    const september = await within(rail).findByRole("button", { name: "sept" });

    await user.click(september);

    await waitFor(() =>
      expect(mocks.getMyDiary).toHaveBeenLastCalledWith(1, 20, expect.objectContaining({ year: 2026, month: 9 })),
    );
    expect(september).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Quitar filtro: Septiembre 2026" })).toBeInTheDocument();

    await user.click(within(rail).getByRole("button", { name: "Todo el diario" }));
    await waitFor(() => expect(within(rail).getByRole("button", { name: "Todo el diario" })).toHaveAttribute("aria-pressed", "true"));
  });

  it("«Anotar» crea la escucha, la abre al frente del diario y la quita de Para anotar", async () => {
    const user = userEvent.setup();
    const created: ListenEntry = {
      ...entry,
      id: "a1b2c3d4-0000-4000-8000-0000000000c1",
      createdAt: "2026-10-21T12:00:00.000Z",
      target: { type: "release-group", id: wanted[0]!.target.id, title: "Dr. Feelgood", subtitle: "Mötley Crüe", coverThumbUrl: null },
    };
    mocks.createListenEntry.mockResolvedValue(created);
    renderDiary();

    await user.click(screen.getByRole("button", { name: "Anotar una escucha de Dr. Feelgood" }));

    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: wanted[0]!.target.id });
    const rail = screen.getByRole("complementary", { name: "Contexto del diario" });
    await waitFor(() => expect(within(rail).queryByText("Dr. Feelgood")).not.toBeInTheDocument());
    // al frente del diario, con su formulario abierto
    const firstRow = screen.getAllByRole("listitem").find((item) => !rail.contains(item))!;
    expect(within(firstRow).getByRole("link", { name: "Dr. Feelgood" })).toBeInTheDocument();
    expect(within(firstRow).getByLabelText(/Impresión/)).toBeInTheDocument();
  });

  it("si «Anotar» falla, el pendiente se queda y se avisa", async () => {
    const user = userEvent.setup();
    mocks.createListenEntry.mockRejectedValue(new Error("red"));
    renderDiary();

    await user.click(screen.getByRole("button", { name: "Anotar una escucha de Ratt" }));

    const rail = screen.getByRole("complementary", { name: "Contexto del diario" });
    expect(await within(rail).findByRole("alert")).toBeInTheDocument();
    expect(within(rail).getByText("Ratt")).toBeInTheDocument();
  });

  it("sin pendientes no muestra Para anotar; siempre enlaza a cómo lo ven otros", () => {
    renderDiary([]);
    const rail = screen.getByRole("complementary", { name: "Contexto del diario" });
    expect(within(rail).queryByRole("heading", { name: "Para anotar" })).not.toBeInTheDocument();
    expect(within(rail).getByRole("link", { name: /Ver tu diario en el perfil/ })).toHaveAttribute("href", "/users/ana/diary");
  });
});
