import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { WelcomeFlow } from "./WelcomeFlow";

const mocks = vi.hoisted(() => ({
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchArtists: vi.fn(),
  getSearchSuggestions: vi.fn(),
  followArtist: vi.fn(),
  unfollowArtist: vi.fn(),
  createListenEntry: vi.fn(),
  deleteListenEntry: vi.fn(),
  completeOnboarding: vi.fn(),
  toggleWantToListen: vi.fn(),
  removeFromWantToListen: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
  getSearchSuggestions: mocks.getSearchSuggestions,
  followArtist: mocks.followArtist,
  unfollowArtist: mocks.unfollowArtist,
}));
vi.mock("@/lib/api/diary", () => ({
  createListenEntry: mocks.createListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
}));
vi.mock("@/lib/api/want-to-listen", () => ({
  toggleWantToListen: mocks.toggleWantToListen,
  removeFromWantToListen: mocks.removeFromWantToListen,
}));
vi.mock("@/lib/api/onboarding", () => ({ completeOnboarding: mocks.completeOnboarding }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/LazyCoverImage", () => ({ LazyCoverImage: () => null }));

const inRainbowsId = "a1b2c3d4-0000-4000-8000-000000000090";
const radioheadId = "a1b2c3d4-0000-4000-8000-000000000091";

const albumResponse = {
  type: "album" as const,
  remoteFailed: false,
  total: 1,
  nextOffset: null,
  refine: null,
  results: [
    {
      kind: "release-group" as const,
      id: inRainbowsId,
      mbid: null,
      title: "In Rainbows",
      artistName: "Radiohead",
      category: "studio" as const,
      year: 2007,
      cached: true,
    },
  ],
};

const artistResponse = {
  type: "artist" as const,
  remoteFailed: false,
  results: [
    {
      kind: "artist" as const,
      id: radioheadId,
      mbid: null,
      name: "Radiohead",
      disambiguation: "rock británico",
      artistType: "group" as const,
      country: null,
      cached: true,
      exact: false,
    },
  ],
};

function renderFlow(props: Partial<Parameters<typeof WelcomeFlow>[0]> = {}) {
  return renderWithIntl(
    <WelcomeFlow userId="user-1" favoriteAudience="public" diaryAudience="private" exploreEnabled notice={<p>aviso-email</p>} {...props} />,
  );
}

/** Los pasos inactivos están ocultos (`hidden`): solo uno es visible a la vez. */
function visibleSteps() {
  return screen
    .getAllByRole("heading", { level: 2, hidden: true })
    .filter((h) => !h.closest("[hidden]"))
    .map((h) => h.textContent);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mocks.getSearchSuggestions.mockResolvedValue({ suggestions: [] });
  mocks.searchAlbums.mockResolvedValue(albumResponse);
  mocks.searchArtists.mockResolvedValue(artistResponse);
  mocks.followArtist.mockResolvedValue({ following: true });
  mocks.createListenEntry.mockResolvedValue({ id: "a1b2c3d4-0000-4000-8000-0000000000e1" });
  mocks.toggleWantToListen.mockResolvedValue({ id: "w1" });
  mocks.removeFromWantToListen.mockResolvedValue(null);
  mocks.completeOnboarding.mockResolvedValue({ onboardedAt: "2026-10-09T00:00:00.000Z" });
});

describe("WelcomeFlow", () => {
  it("muestra un solo paso a la vez, con progreso y el aviso de email", () => {
    renderFlow();

    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
    expect(screen.getByText("aviso-email")).toBeInTheDocument();
    expect(visibleSteps()).toEqual(["Álbumes que te definen"]);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Álbumes");
  });

  it("avanza, retrocede y conserva lo elegido en cada paso", async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007/ }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Paso 2 de 4")).toBeInTheDocument();
    expect(visibleSteps()).toEqual(["Artistas que quieres seguir"]);
    await user.click(screen.getByRole("button", { name: "Atrás" }));

    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar In Rainbows" })).toBeInTheDocument();
  });

  it("el botón de avance dice «Saltar este paso» mientras el paso está vacío", async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));

    expect(screen.getByText("Paso 2 de 4")).toBeInTheDocument();
    expect(mocks.followArtist).not.toHaveBeenCalled();
  });

  it("muestra el aviso de audiencia efectiva de favoritos y de diario", async () => {
    const user = userEvent.setup();
    renderFlow({ favoriteAudience: "followers", diaryAudience: "private" });

    expect(screen.getByText("Visibilidad de tus favoritos: Tus seguidores")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    expect(screen.getByText("Visibilidad de tu diario: Solo tú")).toBeInTheDocument();
  });

  it("sin haber hecho nada la salida dice «Saltar por ahora», cierra con cero álbumes y muestra el resumen vacío", async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole("button", { name: "Saltar por ahora" }));

    await waitFor(() => expect(mocks.completeOnboarding).toHaveBeenCalledWith([]));
    expect(await screen.findByRole("heading", { name: "Todo listo" })).toBeInTheDocument();
    expect(screen.getByText(/No guardaste nada por ahora/)).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("con algo hecho la salida dice «Terminar ahora», guarda los álbumes y resume lo hecho", async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007/ }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.type(screen.getByRole("searchbox"), "radiohead");
    await user.click(await screen.findByRole("button", { name: /rock británico/ }));
    await user.click(screen.getByRole("button", { name: "Terminar ahora" }));

    await waitFor(() => expect(mocks.completeOnboarding).toHaveBeenCalledWith([inRainbowsId]));
    expect(await screen.findByRole("heading", { name: "Todo listo" })).toBeInTheDocument();
    expect(screen.getByText("1 álbum favorito")).toBeInTheDocument();
    expect(screen.getByText("Sigues a 1 artista")).toBeInTheDocument();
    expect(screen.queryByText(/escucha en tu diario/)).not.toBeInTheDocument();
  });

  it("en el último paso «Terminar» cierra y «Ir a Inicio» navega y refresca", async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    expect(screen.queryByRole("button", { name: "Saltar por ahora" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Terminar" }));
    await user.click(await screen.findByRole("button", { name: "Ir a Inicio" }));

    expect(mocks.push).toHaveBeenCalledWith("/");
    // Sin `router.refresh()`: pedía Inicio dos veces y el layout no cambia con el cierre.
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("el resumen cuenta lo guardado en Pendientes y sugiere géneros y valorar si no registró escuchas", async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007/ }));
    await screen.findByRole("button", { name: "Quitar In Rainbows de Pendientes" });
    await user.click(screen.getByRole("button", { name: "Terminar" }));

    await screen.findByRole("heading", { name: "Todo listo" });
    expect(screen.getByText("1 elemento en tus Pendientes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Elegir tus géneros" })).toHaveAttribute("href", "/me/settings/profile");
    expect(screen.getByRole("link", { name: "Valorar un disco" })).toBeInTheDocument();
  });

  it("no sugiere valorar si ya registró una escucha", async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    await user.click(screen.getByRole("button", { name: "Saltar este paso" }));
    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007/ }));
    await screen.findByRole("button", { name: "Deshacer el registro de In Rainbows" });
    await user.click(screen.getByRole("button", { name: "Terminar ahora" }));

    await screen.findByRole("heading", { name: "Todo listo" });
    expect(screen.queryByRole("link", { name: "Valorar un disco" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Elegir tus géneros" })).toBeInTheDocument();
  });

  it("el resumen tiene una sola acción principal y las demás salidas van en una lista secundaria", async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole("button", { name: "Saltar por ahora" }));

    await screen.findByRole("heading", { name: "Todo listo" });
    // Un único botón de acción: «Ir a Inicio». Lo demás son enlaces dentro de «También puedes».
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Ir a Inicio" })).toBeInTheDocument();
    const also = screen.getByRole("navigation", { name: "También puedes" });
    expect(within(also).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Elegir tus géneros",
      "Valorar un disco",
      "Explorar álbumes",
      "Buscar gente",
    ]);
  });

  it("ofrece Explorar en el resumen solo si está activo", async () => {
    const user = userEvent.setup();
    const { unmount } = renderFlow({ exploreEnabled: false });
    await user.click(screen.getByRole("button", { name: "Saltar por ahora" }));
    await screen.findByRole("heading", { name: "Todo listo" });
    expect(screen.queryByRole("link", { name: /Explorar álbumes/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Buscar gente/ })).toBeInTheDocument();
    unmount();

    renderFlow({ exploreEnabled: true });
    await user.click(screen.getByRole("button", { name: "Saltar por ahora" }));
    expect(await screen.findByRole("link", { name: /Explorar álbumes/ })).toBeInTheDocument();
  });

  it("recargar la pestaña conserva el paso, los álbumes elegidos, lo seguido y lo registrado", async () => {
    const user = userEvent.setup();
    const first = renderFlow();

    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007/ }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.type(screen.getByRole("searchbox"), "radiohead");
    await user.click(await screen.findByRole("button", { name: /rock británico/ }));
    await screen.findByRole("button", { name: "Dejar de seguir a Radiohead" });
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007/ }));
    await screen.findByRole("button", { name: "Deshacer el registro de In Rainbows" });
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007/ }));
    await screen.findByRole("button", { name: "Quitar In Rainbows de Pendientes" });
    first.unmount();

    renderFlow();

    expect(await screen.findByText("Paso 4 de 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar In Rainbows de Pendientes" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByRole("button", { name: "Deshacer el registro de In Rainbows" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByRole("button", { name: "Dejar de seguir a Radiohead" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByRole("button", { name: "Quitar In Rainbows" })).toBeInTheDocument();
    expect(screen.getByText("Elegiste 1 álbum · Sugerimos entre 3 y 5.")).toBeInTheDocument();
    // Recorre cuatro pasos con búsquedas de debounce: bajo carga paralela supera los 5 s por defecto.
  }, 30_000);

  it("lo guardado es por persona: otra cuenta en la misma pestaña empieza de cero", async () => {
    const user = userEvent.setup();
    const first = renderFlow({ userId: "user-1" });
    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007/ }));
    first.unmount();

    renderFlow({ userId: "user-2" });

    expect(screen.getByText("Elegiste 0 álbumes · Sugerimos entre 3 y 5.")).toBeInTheDocument();
  });

  it("al cerrar borra lo guardado en la pestaña", async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.type(screen.getByRole("searchbox"), "in rainbows");
    await user.click(await screen.findByRole("button", { name: /Radiohead · 2007/ }));
    await waitFor(() => expect(window.sessionStorage.getItem("welcome:user-1:albums")).not.toBeNull());

    await user.click(screen.getByRole("button", { name: "Terminar ahora" }));

    await screen.findByRole("heading", { name: "Todo listo" });
    expect(window.sessionStorage.getItem("welcome:user-1:albums")).toBeNull();
  });

  it("descarta lo guardado que no tiene la forma esperada", () => {
    window.sessionStorage.setItem("welcome:user-1:albums", JSON.stringify([{ id: 1 }]));
    window.sessionStorage.setItem("welcome:user-1:step", JSON.stringify(9));

    renderFlow();

    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
    expect(screen.getByText("Elegiste 0 álbumes · Sugerimos entre 3 y 5.")).toBeInTheDocument();
  });

  it("si cerrar falla, muestra el error y se queda en el flujo", async () => {
    mocks.completeOnboarding.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole("button", { name: "Saltar por ahora" }));

    expect(await screen.findByText("No pudimos completar el paso. Prueba de nuevo.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Todo listo" })).not.toBeInTheDocument();
    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
  });
});
