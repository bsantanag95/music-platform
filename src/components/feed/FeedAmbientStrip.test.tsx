import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FeedAmbientStrip } from "./FeedAmbientStrip";
import type { AmbientGroup } from "@/services/feed/ambient";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(
    (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  ),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const artistGroup: AmbientGroup = {
  kind: "follow-artist",
  author: { username: "ana", displayName: "Ana" },
  count: 2,
  sample: [
    { label: "Radiohead", href: "/artist/a1" },
    { label: "Pink Floyd", href: "/artist/a2" },
  ],
  lastAt: "2026-09-08T00:00:00Z",
};

const collectionGroup: AmbientGroup = {
  kind: "collection",
  author: { username: "leo", displayName: null },
  count: 5,
  sample: [
    { label: "Rumours", href: "/album/rg1" },
    { label: "Tusk", href: "/album/rg2" },
    { label: "Mirage", href: "/album/rg3" },
  ],
  lastAt: "2026-09-06T00:00:00Z",
};

describe("FeedAmbientStrip", () => {
  it("no renderiza nada cuando no hay grupos", async () => {
    const { container } = renderWithIntl(await FeedAmbientStrip({ groups: [] }));
    expect(container).toBeEmptyDOMElement();
  });

  it("una línea por grupo: autor enlazado, verbo del tipo e ítems enlazados", async () => {
    renderWithIntl(await FeedAmbientStrip({ groups: [artistGroup] }));

    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/users/ana");
    expect(screen.getByText("ambient.followArtistVerb")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Radiohead" })).toHaveAttribute("href", "/artist/a1");
    expect(screen.getByRole("link", { name: "Pink Floyd" })).toHaveAttribute("href", "/artist/a2");
    // sin "y N más": count == sample.length
    expect(screen.queryByText(/ambient\.andMore/)).not.toBeInTheDocument();
  });

  it("agrega 'y N más' cuando el recuento supera la muestra", async () => {
    renderWithIntl(await FeedAmbientStrip({ groups: [collectionGroup] }));

    expect(screen.getByText("collectionVerb", { exact: false })).toBeInTheDocument();
    // 5 - 3 = 2
    expect(screen.getByText(/ambient\.andMore.*"count":2/)).toBeInTheDocument();
    expect(screen.getByText(/@leo/)).toBeInTheDocument();
  });

  it("renderiza los dos verbos según el tipo de grupo (seguir usuario ya no es fuente acá)", async () => {
    const { container } = renderWithIntl(
      await FeedAmbientStrip({ groups: [artistGroup, collectionGroup] }),
    );

    expect(container.textContent).toContain("ambient.followArtistVerb");
    expect(container.textContent).toContain("ambient.collectionVerb");
  });
});
