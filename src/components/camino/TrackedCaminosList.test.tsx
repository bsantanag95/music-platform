import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { TrackedCaminosList } from "./TrackedCaminosList";
import type { TrackedListSummary } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({ setListTracking: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
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
    ...over,
  };
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
    await user.click(screen.getByRole("button", { name: "Siguiendo mi progreso" }));
    expect(mocks.setListTracking).toHaveBeenCalledWith("l1", false);
    await screen.findByText(
      "Todavía no estás siguiendo el progreso de ninguna lista ajena. Activalo desde el detalle de una lista de álbumes.",
    );
  });
});
