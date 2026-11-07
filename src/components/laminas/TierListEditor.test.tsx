import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TierListDetail } from "@/lib/api/schemas";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({
  arrange: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  fetch: vi.fn(),
  del: vi.fn(),
  push: vi.fn(),
  add: vi.fn(),
  search: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/lib/api/laminas", () => ({
  arrangeTierList: mocks.arrange,
  updateTierList: mocks.update,
  removeTierListItem: mocks.remove,
  fetchTierList: mocks.fetch,
  deleteLamina: mocks.del,
  addTierListItem: mocks.add,
}));
vi.mock("@/components/quick-actions/use-target-search", () => ({ useTargetSearch: mocks.search }));
vi.mock("@/components/share/OwnShareSheet", () => ({ OwnShareButton: () => null }));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));

import { TierListEditor } from "./TierListEditor";

const ID = "20000000-0000-4000-8000-000000000001";
const NEW = "10000000-0000-4000-8000-000000000009";
const item = (n: number, score: { stars: string; detailedScore: number | null } | null = null) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  position: n,
  target: { id: `10000000-0000-4000-8000-00000000000${n}`, title: `Disco ${n}`, artistName: "Banda", coverThumbUrl: null },
  score,
});

const tierList = (over: Partial<TierListDetail> = {}): TierListDetail => ({
  id: ID,
  kind: "tier",
  title: "Tier list de Banda",
  entityType: "release-group",
  audience: "private",
  updatedAt: "2026-11-07T00:00:00.000Z",
  showScores: false,
  labels: ["S", "A", "B", "C", "D", "E"],
  tiers: [[item(1, { stars: "5", detailedScore: 96 })], [item(2), item(3)], [], [], [], []],
  tray: [item(4)],
  ...over,
});

const render = (initial = tierList()) => renderWithIntl(<TierListEditor initial={initial} ownerUsername="ana" />);
const disc = (n: number) => screen.getByRole("button", { name: new RegExp(`^Disco ${n}, en`) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockImplementation((_type: string, query: string) => ({
    candidates: query ? [{ type: "release-group", id: item(1).target.id, title: "Disco 1" }, { type: "release-group", id: NEW, title: "Disco nuevo", subtitle: "Banda", year: 1999 }] : [],
    searchable: query.length >= 2,
  }));
  mocks.arrange.mockImplementation(async (_id: string, arrangement: { tiers: string[][]; tray: string[] }) => {
    const all = new Map([...tierList().tiers.flat(), ...tierList().tray].map((i) => [i.id, i]));
    const pick = (ids: string[]) => ids.map((id) => all.get(id)!);
    return tierList({ tiers: arrangement.tiers.map(pick), tray: pick(arrangement.tray) });
  });
  mocks.update.mockImplementation(async (_id: string, changes: Partial<TierListDetail> & { tierLabels?: string[] }) =>
    tierList(changes.tierLabels ? { labels: changes.tierLabels } : {}),
  );
});

describe("TierListEditor", () => {
  it("muestra los seis niveles, la bandeja y la nota del dueño solo en el menú", async () => {
    render();
    expect(screen.getAllByRole("list")).toHaveLength(6 + 1);
    expect(screen.getByText("Sin escuchar / sin valorar")).toBeInTheDocument();
    expect(screen.queryByText("Tu nota: 96")).not.toBeInTheDocument();
    await userEvent.click(disc(1));
    expect(within(screen.getByRole("menu")).getByText("Tu nota: 96")).toBeInTheDocument();
  });

  it("con el teclado: abre el menú, lo recorre con flechas y mueve a S", async () => {
    render();
    disc(4).focus();
    await userEvent.keyboard("{Enter}");
    const menu = screen.getByRole("menu");
    // El primer nivel disponible recibe el foco, con el menú ya visible: oculto, el navegador no lo enfocaría.
    expect(menu.style.visibility).toBe("visible");
    expect(document.activeElement).toBe(within(menu).getAllByRole("menuitem")[0]);
    await userEvent.keyboard("{ArrowDown}{ArrowUp}{Enter}");
    expect(mocks.arrange).toHaveBeenCalledWith(ID, {
      tiers: [[item(1).id, item(4).id], [item(2).id, item(3).id], [], [], [], []],
      tray: [],
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByText("Disco 4: movido a S")).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(disc(4)));
  });

  it("el nivel actual está deshabilitado y Escape devuelve el foco al disco", async () => {
    render();
    await userEvent.click(disc(2));
    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(items[1]).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(disc(2));
  });

  it("a la izquierda y a la derecha dentro del nivel", async () => {
    render();
    await userEvent.click(disc(2));
    expect(within(screen.getByRole("menu")).getByRole("menuitem", { name: "A la izquierda" })).toBeDisabled();
    await userEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "A la derecha" }));
    expect(mocks.arrange).toHaveBeenCalledWith(ID, expect.objectContaining({ tiers: [[item(1).id], [item(3).id, item(2).id], [], [], [], []] }));
  });

  it("arrastrar y soltar sobre un disco lo deja antes de ese disco", async () => {
    render();
    const data = new Map<string, string>();
    const dataTransfer = { setData: (k: string, v: string) => data.set(k, v), getData: (k: string) => data.get(k) ?? "", dropEffect: "", effectAllowed: "" };
    fireEvent.dragStart(disc(4), { dataTransfer });
    fireEvent.dragOver(disc(3), { dataTransfer });
    fireEvent.drop(disc(3), { dataTransfer });
    // Se guarda en cola, después del cambio que ya se ve.
    expect(within(screen.getByRole("list", { name: /^A:/ })).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Disco 2, en A. Mover a…",
      "Disco 4, en A. Mover a…",
      "Disco 3, en A. Mover a…",
    ]);
    await waitFor(() =>
      expect(mocks.arrange).toHaveBeenCalledWith(ID, { tiers: [[item(1).id], [item(2).id, item(4).id, item(3).id], [], [], [], []], tray: [] }),
    );
  });

  it("si guardar falla, recarga lo guardado y avisa", async () => {
    mocks.arrange.mockRejectedValue(new Error("400"));
    mocks.fetch.mockResolvedValue(tierList());
    render();
    await userEvent.click(disc(4));
    await userEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "S" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith(ID));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole("list", { name: /^Sin escuchar/ })).getAllByRole("button")).toHaveLength(1));
  });

  it("renombra un nivel al salir del campo", async () => {
    render();
    const field = screen.getByRole("textbox", { name: "Etiqueta del nivel 1" });
    await userEvent.clear(field);
    await userEvent.type(field, "Dios");
    await userEvent.tab();
    expect(mocks.update).toHaveBeenCalledWith(ID, { tierLabels: ["Dios", "A", "B", "C", "D", "E"] });
  });

  it("Enter guarda la etiqueta sin agregar un renglón", async () => {
    render();
    const field = screen.getByRole("textbox", { name: "Etiqueta del nivel 6" });
    await userEvent.clear(field);
    await userEvent.type(field, "Nunca más{Enter}");
    expect(mocks.update).toHaveBeenCalledWith(ID, { tierLabels: ["S", "A", "B", "C", "D", "Nunca más"] });
  });

  it("una etiqueta vacía no se guarda y avisa", async () => {
    render();
    const field = screen.getByRole("textbox", { name: "Etiqueta del nivel 2" });
    await userEvent.clear(field);
    await userEvent.tab();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Cada nivel lleva entre 1 y 12 caracteres.");
    expect(field).toHaveValue("A");
  });

  it("quitar un disco desde su menú", async () => {
    mocks.remove.mockResolvedValue(tierList({ tray: [] }));
    render();
    await userEvent.click(disc(4));
    await userEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Quitar de la tier list" }));
    expect(mocks.remove).toHaveBeenCalledWith(ID, item(4).id);
  });

  it("agrega a mano: el servidor lo ubica y se anuncia dónde quedó", async () => {
    const added = { ...item(9), target: { ...item(9).target, id: NEW, title: "Disco nuevo" } };
    mocks.add.mockResolvedValue(tierList({ tiers: [[item(1)], [item(2), item(3)], [added], [], [], []] }));
    render();
    await userEvent.type(screen.getByRole("searchbox", { name: "Agregar un disco" }), "nuevo");
    expect(mocks.search).toHaveBeenLastCalledWith("album", "nuevo");
    // Lo que ya está no se ofrece.
    expect(screen.queryByRole("button", { name: /^Disco 1$/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Disco nuevo/ }));
    await waitFor(() => expect(mocks.add).toHaveBeenCalledWith(ID, NEW));
    expect(await screen.findByText("Disco nuevo: agregado en B")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Agregar un disco" })).toHaveValue("");
  });

  it("una tier list de canciones busca canciones", () => {
    render(tierList({ entityType: "recording" }));
    expect(screen.getByRole("list", { name: "A: 2 canciones" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Agregar una canción" })).toBeInTheDocument();
    expect(mocks.search).toHaveBeenLastCalledWith("song", "");
  });

  it("llena, no ofrece agregar", () => {
    const many = Array.from({ length: 50 }, (_, n) => ({ ...item(1), id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}` }));
    render(tierList({ tiers: [many, [], [], [], [], []], tray: [] }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByText("Ya tiene 50. Quita algo para agregar otro.")).toBeInTheDocument();
  });
});
