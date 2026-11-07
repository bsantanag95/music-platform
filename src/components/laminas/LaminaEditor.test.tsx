import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaminaDetail } from "@/lib/api/schemas";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({ update: vi.fn(), add: vi.fn(), remove: vi.fn(), reorder: vi.fn(), del: vi.fn(), push: vi.fn(), search: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/lib/api/laminas", () => ({
  updateLamina: mocks.update,
  addLaminaItem: mocks.add,
  removeLaminaItem: mocks.remove,
  reorderLamina: mocks.reorder,
  deleteLamina: mocks.del,
}));
vi.mock("@/components/quick-actions/use-target-search", () => ({ useTargetSearch: mocks.search }));
vi.mock("@/components/share/OwnShareSheet", () => ({ OwnShareButton: () => null }));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));

import { LaminaEditor } from "./LaminaEditor";

const item = (n: number) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  position: n,
  target: { id: `10000000-0000-4000-8000-00000000000${n}`, title: `Disco ${n}`, artistName: "Banda", coverThumbUrl: null },
  score: null,
});

const lamina = (over: Partial<LaminaDetail> = {}): LaminaDetail => ({
  id: "20000000-0000-4000-8000-000000000001",
  title: "Mis discos",
  format: "top5",
  entityType: "release-group",
  audience: "private",
  updatedAt: "2026-11-06T00:00:00.000Z",
  showScores: false,
  items: [item(1), item(2), item(3)],
  ...over,
});

const render = (initial = lamina()) => renderWithIntl(<LaminaEditor initial={initial} ownerUsername="ana" />);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockReturnValue({ candidates: [], searchable: false });
});

describe("LaminaEditor", () => {
  it("mover un ítem manda el orden completo", async () => {
    mocks.reorder.mockImplementation(async () => lamina());
    render();
    await userEvent.click(screen.getByRole("button", { name: "Subir Disco 2" }));
    expect(mocks.reorder).toHaveBeenCalledWith(lamina().id, [item(2).id, item(1).id, item(3).id]);
  });

  it("el primero no sube y el último no baja", () => {
    render();
    expect(screen.getByRole("button", { name: "Subir Disco 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar Disco 3" })).toBeDisabled();
  });

  it("cambiar a un formato con lugar guarda sin preguntar", async () => {
    mocks.update.mockResolvedValue(lamina({ format: "top10" }));
    render();
    await userEvent.click(screen.getByRole("button", { name: "Top 10" }));
    expect(mocks.update).toHaveBeenCalledWith(lamina().id, { format: "top10" });
  });

  it("bajar de formato avisa qué se pierde y permite cancelar", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7].map(item);
    render(lamina({ format: "top10", items }));
    await userEvent.click(screen.getByRole("button", { name: "Top 5" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Disco 6, Disco 7/)).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("completa, no ofrece buscar", () => {
    render(lamina({ items: [1, 2, 3, 4, 5].map(item) }));
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.getByText(/Ya está completa/)).toBeTruthy();
  });

  it("no ofrece lo que ya está y agrega lo elegido", async () => {
    mocks.search.mockReturnValue({
      searchable: true,
      candidates: [
        { type: "release-group", id: item(1).target.id, title: "Disco 1", subtitle: null, year: null, category: null },
        { type: "release-group", id: "30000000-0000-4000-8000-000000000001", title: "Otro disco", subtitle: "Banda", year: 1999, category: null },
      ],
    });
    mocks.add.mockResolvedValue(lamina());
    render();
    expect(screen.queryByRole("button", { name: /^Disco 1/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Otro disco/ }));
    expect(mocks.add).toHaveBeenCalledWith(lamina().id, "30000000-0000-4000-8000-000000000001");
  });

  it("las notas se encienden con un gesto explícito", async () => {
    mocks.update.mockResolvedValue(lamina({ showScores: true }));
    render();
    await userEvent.click(screen.getByRole("checkbox", { name: /Mostrar mis notas/ }));
    expect(mocks.update).toHaveBeenCalledWith(lamina().id, { showScores: true });
  });

  it("un fallo se muestra", async () => {
    mocks.remove.mockRejectedValue(new Error("no"));
    render();
    await userEvent.click(screen.getByRole("button", { name: "Quitar Disco 1" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
