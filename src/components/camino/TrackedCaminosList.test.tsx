import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { TrackedCaminosList } from "./TrackedCaminosList";
import type { TrackedListSummary } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({ setListTracking: vi.fn(), push: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/lib/api/camino", () => ({ setListTracking: mocks.setListTracking }));

function summary(over: Partial<TrackedListSummary> = {}): TrackedListSummary {
  return {
    id: "l1",
    title: "Discos que me cambiaron",
    coverThumbUrl: null,
    kind: "standard",
    owner: { id: "o1", username: "otra", displayName: "Otra Persona" },
    state: "in_progress",
    progress: { selectedCount: 4, listenedCount: 2 },
    updatedAt: "2026-01-01T00:00:00.000Z",
    nextUp: null,
    lastListenedAt: null,
    ...over,
  };
}

// openspec: redesign-progress-views — "Dejar de seguir" vive en el menú ⋯ de la fila.
async function untrack(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(screen.getByRole("button", { name: `Más acciones para ${title}` }));
  await user.click(screen.getByRole("menuitem", { name: "Dejar de seguir" }));
}

describe("TrackedCaminosList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("estado vacío sin listas trackeadas", () => {
    renderWithIntl(<TrackedCaminosList lists={[]} />);
    expect(
      screen.getByText(
        "Todavía no estás siguiendo el progreso de ninguna lista ajena. Activalo desde el detalle de una lista de álbumes.",
      ),
    ).toBeInTheDocument();
  });

  it("enlaza a /users/[username]/lists/[id] para una lista estándar y /caminos/[id] para un Camino", () => {
    renderWithIntl(
      <TrackedCaminosList
        lists={[
          summary({ id: "l1", title: "Lista", kind: "standard" }),
          summary({ id: "l2", title: "Camino ajeno", kind: "custom_journey" }),
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Lista" })).toHaveAttribute(
      "href",
      "/users/otra/lists/l1",
    );
    expect(screen.getByRole("link", { name: "Camino ajeno" })).toHaveAttribute(
      "href",
      "/users/otra/caminos/l2",
    );
  });

  it("el buscador filtra por título o por dueño", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <TrackedCaminosList
        lists={[
          summary({ id: "l1", title: "Shoegaze", owner: { id: "o1", username: "fran", displayName: null } }),
          summary({ id: "l2", title: "Jazz", owner: { id: "o2", username: "dario", displayName: null } }),
        ]}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "fran");
    expect(screen.getByRole("link", { name: "Shoegaze" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Jazz" })).not.toBeInTheDocument();
  });

  it("orden por más progreso ordena de mayor a menor ratio", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <TrackedCaminosList
        lists={[
          summary({ id: "l1", title: "Poco avance", progress: { selectedCount: 10, listenedCount: 1 } }),
          summary({ id: "l2", title: "Casi listo", progress: { selectedCount: 10, listenedCount: 9 } }),
        ]}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar" }), "progress");
    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("/lists/"));
    expect(links.map((l) => l.textContent)).toEqual(["Casi listo", "Poco avance"]);
  });

  it("dejar de seguir quita la entrada de la lista", async () => {
    const user = userEvent.setup();
    mocks.setListTracking.mockResolvedValue({ tracking: false });
    renderWithIntl(<TrackedCaminosList lists={[summary()]} />);
    await untrack(user, "Discos que me cambiaron");
    expect(mocks.setListTracking).toHaveBeenCalledWith("l1", false);
    await screen.findByText(
      "Todavía no estás siguiendo el progreso de ninguna lista ajena. Activalo desde el detalle de una lista de álbumes.",
    );
  });

  // openspec: refine-progress-page-phase1
  it("deshacer vuelve a seguir la lista y la repone en su lugar", async () => {
    const user = userEvent.setup();
    mocks.setListTracking.mockResolvedValue({});
    renderWithIntl(
      <TrackedCaminosList lists={[summary(), summary({ id: "l2", title: "Para el invierno" })]} />,
    );
    await untrack(user, "Discos que me cambiaron");
    expect(screen.getByRole("status")).toHaveTextContent("Dejaste de seguir «Discos que me cambiaron»");
    expect(screen.queryByRole("link", { name: "Discos que me cambiaron" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(mocks.setListTracking).toHaveBeenLastCalledWith("l1", true);
    const links = await screen.findAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Discos que me cambiaron", "Para el invierno"]);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("si deshacer falla lo dice y ya no ofrece Deshacer", async () => {
    const user = userEvent.setup();
    mocks.setListTracking.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("x"));
    renderWithIntl(<TrackedCaminosList lists={[summary()]} />);
    await untrack(user, "Discos que me cambiaron");
    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(await screen.findByText("No pudimos deshacer. Intenta de nuevo.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deshacer" })).not.toBeInTheDocument();
  });

  it("el estado vacío lleva a descubrir listas para completar", () => {
    renderWithIntl(<TrackedCaminosList lists={[]} />);
    expect(screen.getByText("Todavía no sigues ninguna lista")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Descubrir listas para completar" })).toHaveAttribute("href", "/caminos");
  });

  it("la barra se anuncia con un tramo discreto", () => {
    renderWithIntl(<TrackedCaminosList lists={[summary({ progress: { selectedCount: 4, listenedCount: 3 } })]} />);
    expect(screen.getByRole("img", { name: "Avance: casi terminado" })).toBeInTheDocument();
  });

  it("cada fila dice qué disco sigue y cuándo fue la última escucha", () => {
    renderWithIntl(
      <TrackedCaminosList
        lists={[
          summary({
            nextUp: { id: "00000000-0000-4000-8000-000000000001", title: "Hysteria", artistName: "Def Leppard", year: 1987 },
            lastListenedAt: "2026-01-01T00:00:00.000Z",
          }),
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Hysteria" })).toHaveAttribute("href", expect.stringContaining("/album/"));
    expect(screen.getByText(/\(1987\)/)).toBeInTheDocument();
    expect(screen.getByText(/Última escucha/)).toBeInTheDocument();
  });

  it("Ver lista navega al detalle", async () => {
    const user = userEvent.setup();
    renderWithIntl(<TrackedCaminosList lists={[summary()]} />);
    await user.click(screen.getByRole("button", { name: "Más acciones para Discos que me cambiaron" }));
    await user.click(screen.getByRole("menuitem", { name: "Ver lista" }));
    expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining("/users/otra/lists/"));
  });
});
