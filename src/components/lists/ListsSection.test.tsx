import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ListsSection, parseListsTab } from "./ListsSection";

function hrefToString(href: unknown): string {
  if (typeof href === "string") return href;
  if (href && typeof href === "object") {
    const { pathname, query } = href as { pathname: string; query?: Record<string, string> };
    const qs = new URLSearchParams(query ?? {}).toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }
  return "#";
}

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: unknown; children: React.ReactNode }) => (
    <a href={hrefToString(href)} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/me/lists",
}));

describe("parseListsTab", () => {
  it("resuelve valores válidos y cae a 'mine' con cualquier otra cosa", () => {
    expect(parseListsTab("saved")).toBe("saved");
    expect(parseListsTab("discover")).toBe("discover");
    expect(parseListsTab("mine")).toBe("mine");
    expect(parseListsTab(undefined)).toBe("mine");
    expect(parseListsTab("cualquier-cosa")).toBe("mine");
    expect(parseListsTab(["saved", "x"])).toBe("mine");
  });
});

describe("ListsSection", () => {
  it("marca la pestaña activa con aria-selected y expone las tres", () => {
    renderWithIntl(
      <ListsSection activeTab="saved">
        <p>panel</p>
      </ListsSection>,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Guardadas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Mis listas" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("panel");
  });

  it("cada pestaña enlaza a su ?tab= (salvo Mis listas, que va a la raíz)", () => {
    renderWithIntl(
      <ListsSection activeTab="mine">
        <p>panel</p>
      </ListsSection>,
    );
    expect(screen.getByRole("tab", { name: "Descubrir" })).toHaveAttribute(
      "href",
      expect.stringContaining("tab=discover"),
    );
  });
});
