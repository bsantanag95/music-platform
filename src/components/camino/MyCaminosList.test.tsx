import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { MyCaminosList } from "./MyCaminosList";
import type { CaminoSummary } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  deleteCamino: vi.fn(),
  archiveCamino: vi.fn(),
  unarchiveCamino: vi.fn(),
  createCamino: vi.fn(),
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
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));
vi.mock("@/lib/api/camino", () => ({
  deleteCamino: mocks.deleteCamino,
  archiveCamino: mocks.archiveCamino,
  unarchiveCamino: mocks.unarchiveCamino,
  createCamino: mocks.createCamino,
}));

// El modo de visualización persiste en `localStorage` (useCaminoViewMode);
// sin una instancia fresca por test, un test que cambia a Gráfico deja esa
// preferencia para los que corren después y esperan el modo Detallada.
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

function summary(over: Partial<CaminoSummary> = {}): CaminoSummary {
  return {
    id: "c1",
    title: "Shoegaze esencial",
    state: "in_progress",
    progress: { selectedCount: 4, listenedCount: 2 },
    coverThumbUrl: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("MyCaminosList", () => {
  beforeEach(() => {
    installStorage();
    vi.clearAllMocks();
  });

  it("estado vacío sin Caminos, sin buscador ni conmutador de vista", () => {
    renderWithIntl(<MyCaminosList caminos={[]} />);
    expect(screen.getByText("Armá tu primer Camino: una selección propia de álbumes, sin relación con ningún artista en particular.")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("modo Detallada por defecto: enlace principal a la gestión y menú '⋮' con las acciones secundarias", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MyCaminosList caminos={[summary()]} />);
    expect(screen.getByRole("radio", { name: /Detallada/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("link", { name: "Shoegaze esencial" })).toHaveAttribute("href", "/me/caminos/c1");
    await user.click(screen.getByRole("button", { name: "Más acciones para Shoegaze esencial" }));
    expect(screen.getByRole("menuitem", { name: "Gestionar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Archivar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("el buscador filtra por título, sin distinguir diacríticos", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <MyCaminosList
        caminos={[
          summary({ id: "c1", title: "Música de acción" }),
          summary({ id: "c2", title: "Discos para llorar" }),
        ]}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "accion");
    expect(screen.getByRole("link", { name: "Música de acción" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Discos para llorar" })).not.toBeInTheDocument();
  });

  it("una búsqueda sin coincidencias muestra el estado sin resultados", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MyCaminosList caminos={[summary()]} />);
    await user.type(screen.getByRole("searchbox"), "no existe");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  function titles() {
    return screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/me/caminos/"))
      .map((link) => link.textContent);
  }

  it("por defecto respeta el orden de agregado (más reciente primero)", () => {
    renderWithIntl(
      <MyCaminosList
        caminos={[
          summary({ id: "c1", title: "Sabrina" }),
          summary({ id: "c2", title: "Deep Purple" }),
        ]}
      />,
    );
    expect(titles()).toEqual(["Sabrina", "Deep Purple"]);
  });

  it("el orden alfabético reordena por título", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <MyCaminosList
        caminos={[
          summary({ id: "c1", title: "Sabrina" }),
          summary({ id: "c2", title: "Deep Purple" }),
        ]}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar" }), "alpha");
    expect(titles()).toEqual(["Deep Purple", "Sabrina"]);
  });

  it("el orden por estado agrupa en curso, completo y archivado, en ese orden", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <MyCaminosList
        caminos={[
          summary({ id: "c1", title: "Archivado", state: "archived" }),
          summary({ id: "c2", title: "En curso", state: "in_progress" }),
          summary({ id: "c3", title: "Completo", state: "complete" }),
        ]}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar" }), "state");
    expect(titles()).toEqual(["En curso", "Completo", "Archivado"]);
  });

  it("el filtro de estado acota el listado sin alterar el orden", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <MyCaminosList
        caminos={[
          summary({ id: "c1", title: "Archivado", state: "archived" }),
          summary({ id: "c2", title: "En curso", state: "in_progress" }),
        ]}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "archived");
    expect(titles()).toEqual(["Archivado"]);
  });

  it("cambiar a modo Índice sigue mostrando los mismos Caminos", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MyCaminosList caminos={[summary()]} />);
    await user.click(screen.getByRole("radio", { name: /Índice/i }));
    expect(screen.getByRole("radio", { name: /Índice/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("link", { name: "Shoegaze esencial" })).toBeInTheDocument();
  });

  it("cambiar a modo Gráfico sigue mostrando los mismos Caminos", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MyCaminosList caminos={[summary()]} />);
    await user.click(screen.getByRole("radio", { name: /Gráfico/i }));
    expect(screen.getByRole("radio", { name: /Gráfico/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByRole("link", { name: "Shoegaze esencial" }).length).toBeGreaterThan(0);
  });

  it("archivar actualiza el estado de la entrada sin recargar la página", async () => {
    const user = userEvent.setup();
    mocks.archiveCamino.mockResolvedValue({
      id: "c1",
      state: "archived",
      progress: { selectedCount: 4, listenedCount: 2 },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    renderWithIntl(<MyCaminosList caminos={[summary()]} />);
    await user.click(screen.getByRole("button", { name: "Más acciones para Shoegaze esencial" }));
    await user.click(screen.getByRole("menuitem", { name: "Archivar" }));
    const row = (await screen.findByRole("link", { name: "Shoegaze esencial" })).closest("li")!;
    expect(await within(row).findByText("Archivado")).toBeInTheDocument();
  });

  it("eliminar requiere confirmación de dos pasos", async () => {
    const user = userEvent.setup();
    mocks.deleteCamino.mockResolvedValue(undefined);
    renderWithIntl(<MyCaminosList caminos={[summary()]} />);
    await user.click(screen.getByRole("button", { name: "Más acciones para Shoegaze esencial" }));
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(screen.getByText("Confirmar eliminación")).toBeInTheDocument();
    expect(mocks.deleteCamino).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(mocks.deleteCamino).toHaveBeenCalledWith("c1");
  });

  it("un error al eliminar deja la entrada visible con un aviso", async () => {
    const user = userEvent.setup();
    mocks.deleteCamino.mockRejectedValue(new mocks.ApiError("INTERNAL_ERROR"));
    renderWithIntl(<MyCaminosList caminos={[summary()]} />);
    await user.click(screen.getByRole("button", { name: "Más acciones para Shoegaze esencial" }));
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(
      await screen.findByText("No pudimos eliminar el Camino. Intentá de nuevo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shoegaze esencial" })).toBeInTheDocument();
  });
});
