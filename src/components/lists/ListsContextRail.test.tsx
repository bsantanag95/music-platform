import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ListsContextRail } from "./ListsContextRail";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${JSON.stringify(values)})` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("./ListCoverMosaic", () => ({ ListCoverMosaic: () => <span data-testid="mosaic" /> }));
vi.mock("@/components/camino/CaminoDiscoveryGrid", () => ({
  caminoHref: (camino: { id: string }) => `/lists/${camino.id}`,
}));

const resume = { id: "mia", title: "Mi top 2026", entityType: "release-group" as const, itemCount: 7, coverThumbUrls: [] };
const camino = {
  id: "c1",
  title: "Best of Sabrina",
  kind: "standard" as const,
  owner: { id: "o1", username: "besa", displayName: null },
  itemCount: 6,
  coverThumbs: [],
  trackingCount: 1,
};

async function renderRail(props: Parameters<typeof ListsContextRail>[0]) {
  return render(<>{await ListsContextRail(props)}</>);
}

describe("ListsContextRail", () => {
  it("con sesión retoma la lista propia más reciente y enlaza a mis listas y guardadas (redesign-lists-page, D9)", async () => {
    await renderRail({ viewer: { resume }, toComplete: [] });

    expect(screen.getByRole("heading", { name: "community.rail.yourListsTitle" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mi top 2026/ })).toHaveAttribute("href", "/me/lists/mia");
    expect(screen.getByRole("link", { name: /community\.rail\.myLists/ })).toHaveAttribute("href", "/me/lists");
    expect(screen.getByRole("link", { name: /community\.rail\.saved/ })).toHaveAttribute("href", "/me/lists?tab=saved");
    expect(screen.queryByText("community.rail.joinTitle")).not.toBeInTheDocument();
  });

  it("con sesión y sin listas invita a crear la primera", async () => {
    await renderRail({ viewer: { resume: null }, toComplete: [] });

    expect(screen.getByRole("link", { name: "community.rail.createFirst" })).toHaveAttribute("href", "/me/lists?new=1");
  });

  it("sin sesión invita a crear una cuenta o entrar, sin 'Tus listas'", async () => {
    await renderRail({ viewer: null, toComplete: [] });

    expect(screen.queryByText("community.rail.yourListsTitle")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "community.rail.joinAction" })).toHaveAttribute("href", "/auth/register");
    expect(screen.getByRole("link", { name: "community.rail.signIn" })).toHaveAttribute("href", "/auth/login");
  });

  it("'Para completar' lista las que hay, con cuántas personas las completan y 'Ver todas'; sin ninguna, no aparece", async () => {
    const { unmount } = await renderRail({ viewer: null, toComplete: [camino] });

    expect(screen.getByRole("heading", { name: "hub.toComplete" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Best of Sabrina/ })).toHaveAttribute("href", "/lists/c1");
    expect(screen.getByText('trackingCount({"count":1})')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /hub\.seeAll/ })).toHaveAttribute("href", "/caminos");
    unmount();

    await renderRail({ viewer: null, toComplete: [] });
    expect(screen.queryByText("hub.toComplete")).not.toBeInTheDocument();
  });
});
