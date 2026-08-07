import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Breadcrumbs } from "./Breadcrumbs";
import { renderWithIntl } from "@/test/i18n-test-utils";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("Breadcrumbs", () => {
  it("renderiza enlaces para todos los items excepto el último", () => {
    renderWithIntl(
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Pink Floyd", href: "/artist/a1" },
          { label: "The Dark Side of the Moon" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Pink Floyd" })).toHaveAttribute(
      "href",
      "/artist/a1",
    );
    expect(screen.queryByRole("link", { name: "The Dark Side of the Moon" })).not.toBeInTheDocument();
  });

  it("marca el último item como página actual", () => {
    renderWithIntl(
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Álbum" },
        ]}
      />,
    );

    expect(screen.getByText("Álbum")).toHaveAttribute("aria-current", "page");
  });

  it("no renderiza nada con una lista vacía", () => {
    const { container } = renderWithIntl(<Breadcrumbs items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renderiza un solo item sin enlaces", () => {
    renderWithIntl(<Breadcrumbs items={[{ label: "Inicio" }]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Inicio")).toHaveAttribute("aria-current", "page");
  });
});
