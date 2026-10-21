import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ListCard } from "./ListCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("./ListCoverMosaic", () => ({
  ListCoverMosaic: (props: { itemCount?: number; entityType?: string }) => (
    <span data-testid="mosaic" data-count={props.itemCount} data-type={props.entityType} />
  ),
}));

describe("ListCard", () => {
  it("la marca va en su propia línea, antes del título, y el título se parte en dos líneas en vez de truncarse (redesign-lists-page, D1)", () => {
    render(
      <ListCard href="/l" title="Playlist de fondo" meta={<span>Canciones</span>} coverThumbs={[]} badge={<span>Oficial</span>} />,
    );

    const heading = screen.getByRole("heading", { name: "Playlist de fondo" });
    expect(heading.className).toContain("line-clamp-2");
    expect(heading.className).not.toContain("truncate");
    expect(heading.contains(screen.getByText("Oficial"))).toBe(false);
    // La marca precede al título y no comparte su contenedor.
    const badge = screen.getByText("Oficial");
    expect(badge.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(badge.parentElement?.contains(heading)).toBe(false);
  });

  it("pasa los ítems y el tipo al mosaico", () => {
    render(
      <ListCard href="/l" title="T" meta={null} coverThumbs={["a"]} itemCount={7} entityType="artist" />,
    );

    const mosaic = screen.getByTestId("mosaic");
    expect(mosaic).toHaveAttribute("data-count", "7");
    expect(mosaic).toHaveAttribute("data-type", "artist");
  });
});
