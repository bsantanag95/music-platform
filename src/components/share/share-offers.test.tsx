import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { UserListDetail } from "@/lib/api/schemas";

// Ofrecimiento al pasar una lista a pública y Compartir en los menús de las tarjetas propias (spec share-sheet).

const header = vi.hoisted(() => ({ next: null as unknown }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/api/lists", () => ({ reorderListItems: vi.fn(), removeItemFromList: vi.fn(), addItemToList: vi.fn() }));
vi.mock("@/lib/api/share", () => ({ getSharePayload: vi.fn(), postShareEvent: vi.fn() }));
vi.mock("@/components/lists/ListItemsView", () => ({ ListItemsView: () => null }));
vi.mock("@/components/lists/ListDetailHeader", () => ({
  ListDetailHeader: ({ onUpdated }: { onUpdated: (list: unknown) => void }) => (
    <button type="button" onClick={() => onUpdated(header.next)}>
      guardar
    </button>
  ),
}));

import { CaminoCardMenu } from "@/components/camino/CaminoCardMenu";
import { ListDetail } from "@/components/lists/ListDetail";
import { MyListCardMenu } from "@/components/lists/MyListCardMenu";

const list = (audience: "private" | "followers" | "public") =>
  ({ id: "l1", title: "Mi lista", description: null, audience, entityType: "release-group", items: [{ id: "i1" }], itemCount: 1, coverThumbs: [], pinned: false }) as unknown as UserListDetail;

describe("ofrecimiento de una lista", () => {
  it("al pasar a pública ofrece compartir", async () => {
    header.next = list("public");
    renderWithIntl(<ListDetail initial={list("private")} />);
    await userEvent.click(screen.getByRole("button", { name: "guardar" }));
    expect(screen.getByText("Tu lista ya es pública.")).toBeTruthy();
  });

  it("guardar una lista que ya era pública no ofrece nada", async () => {
    header.next = list("public");
    renderWithIntl(<ListDetail initial={list("public")} />);
    await userEvent.click(screen.getByRole("button", { name: "guardar" }));
    expect(screen.queryByText("Tu lista ya es pública.")).toBeNull();
  });

  it("pasar a seguidores no ofrece nada", async () => {
    header.next = list("followers");
    renderWithIntl(<ListDetail initial={list("private")} />);
    await userEvent.click(screen.getByRole("button", { name: "guardar" }));
    expect(screen.queryByText("Tu lista ya es pública.")).toBeNull();
  });
});

describe("menús de las tarjetas propias", () => {
  const openMenu = () => userEvent.click(screen.getByRole("button"));
  const noop = () => {};

  it.each([
    ["public", 1],
    ["private", 0],
    ["followers", 0],
  ] as const)("una lista %s", async (audience, expected) => {
    renderWithIntl(
      <MyListCardMenu
        list={{ id: "l1", title: "Mi lista", audience, pinned: false }}
        ownerUsername="ana"
        onTogglePin={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );
    await openMenu();
    expect(screen.queryAllByRole("menuitem", { name: "Compartir" })).toHaveLength(expected);
  });

  it.each([
    ["public", 1],
    ["private", 0],
  ] as const)("un Camino %s", async (audience, expected) => {
    const camino = { id: "c1", title: "Camino", audience, state: "in_progress" } as never;
    renderWithIntl(<CaminoCardMenu camino={camino} actions={{ archive: noop, requestRemove: noop } as never} />);
    await openMenu();
    expect(screen.queryAllByRole("menuitem", { name: "Compartir" })).toHaveLength(expected);
  });
});
