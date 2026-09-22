import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CaminoReadView } from "./CaminoReadView";
import type { CaminoDetail } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  setListTracking: vi.fn(),
  createListenEntry: vi.fn(),
  deleteListenEntry: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/profiles/UserHoverCard", () => ({
  UserHoverCard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));
vi.mock("@/lib/api/camino", () => ({ setListTracking: mocks.setListTracking }));
vi.mock("@/lib/api/diary", () => ({
  createListenEntry: mocks.createListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
}));

function listenEntry(albumId: string) {
  return {
    id: `le-${albumId}`,
    listenContext: "first_listen",
    body: null,
    reaction: null,
    audience: "private",
    createdAt: "2026-01-01T00:00:00.000Z",
    target: { type: "release-group", id: albumId, title: "Loveless", subtitle: null, coverThumbUrl: null },
  };
}

function camino(over: Partial<CaminoDetail> = {}): CaminoDetail {
  return {
    id: "camino-1",
    title: "Shoegaze esencial",
    description: null,
    audience: "public",
    state: "in_progress",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    progress: { selectedCount: 2, listenedCount: 1 },
    albums: [
      { id: "a1", title: "Loveless", artistName: "My Bloody Valentine", firstReleaseYear: 1991, coverThumbUrl: null, listened: true },
      { id: "a2", title: "Souvlaki", artistName: "Slowdive", firstReleaseYear: 1993, coverThumbUrl: null, listened: false },
    ],
    ...over,
  };
}

function renderView(
  props: Partial<{ tracking: boolean; trackingListenedIds: string[]; canTrack: boolean }> = {},
  caminoOver: Partial<CaminoDetail> = {},
) {
  return renderWithIntl(
    <CaminoReadView
      camino={camino(caminoOver)}
      owner={{ username: "ana", displayName: "Ana" }}
      tracking={props.tracking ?? false}
      trackingListenedIds={props.trackingListenedIds ?? []}
      canTrack={props.canTrack ?? true}
    />,
  );
}

describe("CaminoReadView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra título, dueño y álbumes sin controles de gestión", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Shoegaze esencial" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "de Ana" })).toHaveAttribute("href", "/users/ana");
    expect(screen.getByRole("link", { name: "Loveless" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archivar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("sin tracking activo, no muestra progreso propio ni acciones de escucha", () => {
    renderView({ tracking: false });
    expect(screen.queryByText(/de 2 escuchados/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Registrar escucha/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir mi progreso" })).toBeInTheDocument();
  });

  it("con tracking activo, muestra el progreso propio del visitante (no el del dueño)", () => {
    renderView({ tracking: true, trackingListenedIds: ["a1"] });
    expect(screen.getByText("1 de 2 escuchados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiendo mi progreso" })).toBeInTheDocument();
  });

  it("activar el tracking habilita registrar escucha", async () => {
    const user = userEvent.setup();
    mocks.setListTracking.mockResolvedValueOnce({ tracking: true });
    renderView({ tracking: false });

    await user.click(screen.getByRole("button", { name: "Seguir mi progreso" }));
    expect(mocks.setListTracking).toHaveBeenCalledWith("camino-1", true);
    expect(await screen.findByRole("button", { name: "Registrar escucha de Loveless" })).toBeInTheDocument();
  });

  it("desactivar el tracking oculta el progreso y limpia lo registrado en la sesión", async () => {
    const user = userEvent.setup();
    mocks.setListTracking.mockResolvedValueOnce({ tracking: false });
    renderView({ tracking: true, trackingListenedIds: ["a1"] });

    await user.click(screen.getByRole("button", { name: "Siguiendo mi progreso" }));
    expect(mocks.setListTracking).toHaveBeenCalledWith("camino-1", false);
    expect(await screen.findByRole("button", { name: "Seguir mi progreso" })).toBeInTheDocument();
    expect(screen.queryByText(/escuchados/)).not.toBeInTheDocument();
  });

  it("registrar escucha mientras se trackea actualiza el progreso propio sin tocar el del dueño", async () => {
    const user = userEvent.setup();
    mocks.createListenEntry.mockResolvedValueOnce(listenEntry("a2"));
    renderView({ tracking: true, trackingListenedIds: ["a1"] });

    expect(screen.getByText("1 de 2 escuchados")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Registrar escucha de Souvlaki" }));

    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: "a2" });
    expect(await screen.findByText("2 de 2 escuchados")).toBeInTheDocument();
  });

  it("sin sesión (canTrack=false), no ofrece la acción de tracking", () => {
    renderView({ canTrack: false });
    expect(screen.queryByRole("button", { name: /Seguir mi progreso|Siguiendo mi progreso/ })).not.toBeInTheDocument();
  });
});
