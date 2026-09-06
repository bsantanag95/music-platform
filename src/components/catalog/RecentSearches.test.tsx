import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { RecentSearches } from "@/components/catalog/RecentSearches";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { pushRecentSearch } from "@/lib/search/recent-searches";

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

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as unknown as Storage;
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: memoryStorage(),
  });
});

describe("RecentSearches", () => {
  it("no renderiza nada sin búsquedas guardadas", () => {
    const { container } = renderWithIntl(<RecentSearches />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lista las búsquedas guardadas como enlaces a /search", () => {
    pushRecentSearch("Pink Floyd");
    renderWithIntl(<RecentSearches />);

    expect(
      screen.getByText(catalogEs.search.recent.heading),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pink Floyd" })).toHaveAttribute(
      "href",
      "/search?q=Pink%20Floyd",
    );
  });

  it("quita una entrada y vacía toda la lista", () => {
    pushRecentSearch("Queen");
    pushRecentSearch("Radiohead");
    renderWithIntl(<RecentSearches />);

    fireEvent.click(
      screen.getByRole("button", {
        name: catalogEs.search.recent.remove.replace("{query}", "Queen"),
      }),
    );
    expect(screen.queryByRole("link", { name: "Queen" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Radiohead" })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: catalogEs.search.recent.clearAll }),
    );
    expect(screen.queryByText(catalogEs.search.recent.heading)).not.toBeInTheDocument();
  });
});
