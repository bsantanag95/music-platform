import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ListDetailHeader } from "./ListDetailHeader";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={`/es${href}`}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/components/lists/SaveListButton", () => ({ SaveListButton: () => <button type="button">Guardar</button> }));
vi.mock("@/components/camino/TrackListButton", () => ({ TrackListButton: () => null }));
vi.mock("@/components/profiles/UserHoverCard", () => ({
  UserHoverCard: ({ children }: { children: React.ReactNode }) => <span data-testid="hover-card">{children}</span>,
}));

const list = {
  id: "00000000-0000-4000-8000-000000000001",
  entityType: "release-group" as const,
  title: "Essential new releases",
  description: null,
  audience: "public" as const,
  itemCount: 12,
  coverThumbs: [],
  pinned: false,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  items: [],
};

describe("ListDetailHeader: dueño", () => {
  it("enlaza al perfil del dueño", () => {
    renderWithIntl(
      <ListDetailHeader list={list as never} canManage={false} owner={{ username: "ana", displayName: "Ana" }} />,
      "en",
    );

    expect(screen.getByRole("link", { name: "by Ana" })).toHaveAttribute("href", "/es/users/ana");
  });
});
