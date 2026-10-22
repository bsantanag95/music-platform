import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import DiaryPage from "./page";

const mocks = vi.hoisted(() => ({
  requirePageUser: vi.fn(),
  listMyDiary: vi.fn(),
  listMyWantToListen: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getTimeZone: vi.fn().mockResolvedValue("America/Santiago"),
}));
vi.mock("@/services/auth/page-auth", () => ({ requirePageUser: mocks.requirePageUser }));
vi.mock("@/services/diary/diary", () => ({ listMyDiary: mocks.listMyDiary }));
vi.mock("@/services/want-to-listen/want-to-listen", () => ({ listMyWantToListen: mocks.listMyWantToListen }));
vi.mock("@/components/diary/LogListenButton", () => ({ LogListenButton: () => <button type="button">logListen</button> }));
vi.mock("@/components/diary/DiaryBridge", () => ({
  DiaryBridgeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/diary/DiaryActivityList", () => ({
  DiaryActivityList: ({ initialFilters }: { initialFilters: { reaction: string; type: string } }) => (
    <div data-testid="list" data-reaction={initialFilters.reaction} data-type={initialFilters.type} />
  ),
}));
vi.mock("@/components/diary/DiaryContextRail", () => ({
  DiaryContextRail: ({ toLog, profileDiaryHref }: { toLog: { id: string }[]; profileDiaryHref: string }) => (
    <aside data-testid="rail" data-to-log={toLog.map((item) => item.id).join(",")} data-profile={profileDiaryHref} />
  ),
}));

async function renderPage(searchParams: Record<string, string> = {}) {
  render(await DiaryPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("/me/diary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUser.mockResolvedValue({ id: "u1", username: "ana maría" });
    mocks.listMyDiary.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    mocks.listMyWantToListen.mockResolvedValue({ items: [{ id: "w1" }, { id: "w2" }], page: 1, pageSize: 4, hasNext: false });
  });

  it("muestra la cabecera con la acción de anotar", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "title" })).toBeInTheDocument();
    expect(screen.getByText("subtitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "logListen" })).toBeInTheDocument();
  });

  it("siembra la primera página con los filtros válidos de la URL y la zona horaria", async () => {
    await renderPage({ reaction: "loved", type: "nada", year: "2026", month: "9" });
    expect(mocks.listMyDiary).toHaveBeenCalledWith(
      "u1",
      1,
      20,
      expect.objectContaining({ reaction: "loved", type: undefined, year: 2026, month: 9, timeZone: "America/Santiago" }),
    );
    expect(screen.getByTestId("list")).toHaveAttribute("data-reaction", "loved");
    expect(screen.getByTestId("list")).toHaveAttribute("data-type", "");
  });

  it("el riel recibe hasta 4 pendientes y el enlace al diario del perfil, y solo se ve desde lg", async () => {
    await renderPage();
    expect(mocks.listMyWantToListen).toHaveBeenCalledWith("u1", 1, 4);
    const rail = screen.getByTestId("rail");
    expect(rail).toHaveAttribute("data-to-log", "w1,w2");
    expect(rail).toHaveAttribute("data-profile", "/users/ana%20mar%C3%ADa/diary");
    const wrapper = rail.parentElement as HTMLElement;
    expect(wrapper.className.split(" ")).toEqual(expect.arrayContaining(["hidden", "lg:block", "lg:sticky"]));
  });
});
