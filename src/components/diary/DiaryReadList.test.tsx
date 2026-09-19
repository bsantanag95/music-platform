import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { DiaryListResponse, ListenEntry } from "@/lib/api/schemas";
import { DiaryReadList } from "./DiaryReadList";

const mocks = vi.hoisted(() => ({ getUserDiary: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));
vi.mock("@/lib/api/diary", () => ({ getUserDiary: mocks.getUserDiary }));

let seq = 0;
function entry(over: Partial<ListenEntry> = {}): ListenEntry {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-0000000000${String(seq).padStart(2, "0")}`,
    listenContext: "first_listen",
    body: null,
    reaction: null,
    audience: "public",
    createdAt: "2026-09-14T12:00:00.000Z",
    target: {
      type: "release-group",
      id: `rg${seq}`,
      title: `Álbum ${seq}`,
      subtitle: `Artista ${seq}`,
      artistId: `a${seq}`,
      coverThumbUrl: null,
    },
    ...over,
  };
}

function response(entries: ListenEntry[], over: Partial<DiaryListResponse> = {}): DiaryListResponse {
  return { entries, page: 1, pageSize: 20, hasNext: false, ...over };
}

beforeEach(() => {
  seq = 0;
  vi.clearAllMocks();
});

describe("DiaryReadList", () => {
  it("renderiza una fila por entrada con título enlazado, artista y contexto", () => {
    renderWithIntl(<DiaryReadList initial={response([entry(), entry()])} username="ana" />);
    expect(screen.getByRole("link", { name: "Álbum 1" })).toHaveAttribute("href", "/album/rg1");
    expect(screen.getByRole("link", { name: "Artista 2" })).toHaveAttribute("href", "/artist/a2");
    expect(screen.getAllByText("Primera escucha")).toHaveLength(2);
  });

  it("muestra la nota como cita, y no muestra controles de gestión", () => {
    renderWithIntl(<DiaryReadList initial={response([entry({ body: "Discazo" })])} username="ana" />);
    expect(screen.getByText("“Discazo”")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByText("Público")).not.toBeInTheDocument();
  });

  it("sin entradas: estado vacío del perfil", () => {
    renderWithIntl(<DiaryReadList initial={response([])} username="ana" />);
    expect(screen.getByText("Sin entradas en el diario")).toBeInTheDocument();
  });

  it("scrollable: envuelve las filas en una región con scroll interno, enfocable por teclado", () => {
    renderWithIntl(<DiaryReadList initial={response([entry()])} username="ana" scrollable />);
    const region = screen.getByRole("region", { name: "Entradas del diario" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toMatch(/overflow-y-auto/);
    expect(region.className).toMatch(/max-h-/);
  });

  it("sin scrollable (vista completa): no hay región con altura fija", () => {
    renderWithIntl(<DiaryReadList initial={response([entry()])} username="ana" />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("'Cargar más' pide las entradas del DUEÑO del diario (getUserDiary), no las del visitante", async () => {
    const nueva = entry({
      target: { type: "artist", id: "x", title: "Nueva", subtitle: null, artistId: null, coverThumbUrl: null },
    });
    mocks.getUserDiary.mockResolvedValue(response([nueva], { page: 2 }));
    renderWithIntl(<DiaryReadList initial={response([entry()], { hasNext: true })} username="ana" scrollable />);

    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    await waitFor(() => expect(mocks.getUserDiary).toHaveBeenCalledWith("ana", 2, 20));
    expect(await screen.findByRole("link", { name: "Nueva" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument();
  });

  it("error al cargar más: muestra el aviso y conserva lo ya cargado", async () => {
    mocks.getUserDiary.mockRejectedValue(new Error("boom"));
    renderWithIntl(<DiaryReadList initial={response([entry()], { hasNext: true })} username="ana" />);

    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Álbum 1" })).toBeInTheDocument();
  });
});
