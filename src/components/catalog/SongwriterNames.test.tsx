import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { SongwriterNames } from "./SongwriterNames";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const person = (artistId: string, name: string, ...types: string[]) => ({
  artistId,
  name,
  creditedAs: null,
  roles: types.map((relationType) => ({ relationType, attributes: [] as string[] })),
});

describe("SongwriterNames", () => {
  it("lista los autores enlazados, sin rol cuando es writer", () => {
    const { container } = renderWithIntl(
      <SongwriterNames songwriters={[person("a1", "Jerrod Bettis", "writer"), person("a2", "Audra Mae", "writer")]} />,
    );
    expect(container).toHaveTextContent("Jerrod Bettis, Audra Mae");
    expect(screen.getByRole("link", { name: "Jerrod Bettis" })).toHaveAttribute("href", "/artist/a1");
  });

  it("muestra el rol entre paréntesis para música y letra", () => {
    const { container } = renderWithIntl(
      <SongwriterNames songwriters={[person("a1", "Compositora", "composer"), person("a2", "Letrista", "lyricist", "writer")]} />,
    );
    expect(container).toHaveTextContent("Compositora (música), Letrista (letra)");
  });

  it("sin autores no renderiza nada", () => {
    const { container } = renderWithIntl(<SongwriterNames songwriters={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
