import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CaminoProfileSummary, UserListSummary } from "@/lib/api/schemas";
import { ListsAndCaminosPreview } from "./ListsAndCaminosPreview";
import { ProfileRow } from "./ProfileRow";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: Record<string, unknown>) =>
    values?.count != null ? `${key}:${values.count}` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/lists/ProfileListCard", () => ({
  ProfileListCard: ({ list, canAct }: { list: { id: string }; canAct?: boolean }) => (
    <div data-testid="list" data-can-act={String(canAct)}>
      {list.id}
    </div>
  ),
}));
vi.mock("@/components/camino/CaminoProfileCard", () => ({
  CaminoProfileCard: ({ camino, canTrack }: { camino: { id: string }; canTrack?: boolean }) => (
    <div data-testid="camino" data-can-act={String(canTrack)}>
      {camino.id}
    </div>
  ),
}));

const lists = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `l${i}` })) as unknown as UserListSummary[];
const caminos = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i}` })) as unknown as CaminoProfileSummary[];

describe("ListsAndCaminosPreview", () => {
  it("hasta 4 tarjetas: con listas, 2 listas para completar como máximo", async () => {
    render(
      await ListsAndCaminosPreview({
        username: "ana",
        lists: lists(4),
        listsTotal: 6,
        caminos: caminos(3),
        caminosTotal: 3,
        canAct: true,
      }),
    );
    expect(screen.getAllByTestId("list")).toHaveLength(2);
    expect(screen.getAllByTestId("camino")).toHaveLength(2);
    expect(screen.getByText(/listsAndCaminos.moreLists:6/).closest("a")).toHaveAttribute("href", "/users/ana/lists");
    expect(screen.getByText(/listsAndCaminos.moreCaminos:3/).closest("a")).toHaveAttribute("href", "/users/ana/caminos");
  });

  it("sin listas, las listas para completar ocupan las 4 tarjetas", async () => {
    render(
      await ListsAndCaminosPreview({ username: "ana", lists: [], listsTotal: 0, caminos: caminos(4), caminosTotal: 4, canAct: true }),
    );
    expect(screen.getAllByTestId("camino")).toHaveLength(4);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("sin sesión (o para el dueño) las tarjetas no ofrecen acciones", async () => {
    render(
      await ListsAndCaminosPreview({ username: "ana", lists: lists(1), listsTotal: 1, caminos: caminos(1), caminosTotal: 1, canAct: false }),
    );
    expect(screen.getByTestId("list")).toHaveAttribute("data-can-act", "false");
    expect(screen.getByTestId("camino")).toHaveAttribute("data-can-act", "false");
  });

  it("sin listas ni listas para completar no dibuja nada", async () => {
    expect(
      await ListsAndCaminosPreview({ username: "ana", lists: [], listsTotal: 0, caminos: [], caminosTotal: 0, canAct: true }),
    ).toBeNull();
  });
});

describe("ProfileRow", () => {
  it("con dos secciones, las pone lado a lado; con una, ocupa la fila; sin ninguna, nada", () => {
    const { container, rerender } = render(<ProfileRow start={<p>a</p>} end={<p>b</p>} />);
    expect(container.firstElementChild).toHaveClass("lg:grid-cols-2");
    rerender(<ProfileRow start={null} end={<p>b</p>} />);
    expect(container.firstElementChild).not.toHaveClass("lg:grid-cols-2");
    expect(screen.getByText("b")).toBeInTheDocument();
    rerender(<ProfileRow start={null} end={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
