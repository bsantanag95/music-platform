import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { Header } from "./Header";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mockReplace = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => "/album/rg-1",
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("next-intl", async () => {
  const actual = await vi.importActual("next-intl");
  return {
    ...actual,
    useLocale: () => "es",
    useTranslations: () => (key: string) => {
      const map: Record<string, string> = {
        search: "Buscar",
        localeSwitcher: "Idioma",
      };
      return map[key] ?? key;
    },
  };
});

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["es", "en"], defaultLocale: "es" },
}));

describe("Header", () => {
  it("muestra un enlace al buscador", () => {
    renderWithIntl(<Header />);

    expect(screen.getByRole("link", { name: "Buscar" })).toHaveAttribute("href", "/search");
  });

  it("muestra botones para cada locale", () => {
    renderWithIntl(<Header />);

    expect(screen.getByRole("button", { name: "es" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "en" })).toBeInTheDocument();
  });

  it("marca el locale activo con aria-current", () => {
    renderWithIntl(<Header />);

    expect(screen.getByRole("button", { name: "es" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.queryByRole("button", { name: "en" })).not.toHaveAttribute("aria-current");
  });

  it("cambia de locale preservando la ruta actual", () => {
    renderWithIntl(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "en" }));

    expect(mockReplace).toHaveBeenCalledWith("/album/rg-1", { locale: "en" });
  });
});
