import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
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
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("./ListForm", () => ({
  ListForm: ({ onCreated }: { onCreated: () => void }) => (
    <button type="button" onClick={onCreated}>
      crear
    </button>
  ),
}));

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
const TOTALS = { mine: 14, saved: 4 };

function renderSection(activeTab: "mine" | "saved", children: ReactNode = <p>panel</p>, open = false) {
  const client = new QueryClient();
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <ListsSection activeTab={activeTab} initialTotals={TOTALS} initialNewListOpen={open}>
        {children}
      </ListsSection>
    </QueryClientProvider>,
  );
}

describe("parseListsTab", () => {
  it("resuelve valores válidos y cae a 'mine' con cualquier otra cosa", () => {
    expect(parseListsTab("saved")).toBe("saved");
    expect(parseListsTab("discover")).toBe("mine");
    expect(parseListsTab("mine")).toBe("mine");
    expect(parseListsTab(undefined)).toBe("mine");
    expect(parseListsTab("cualquier-cosa")).toBe("mine");
    expect(parseListsTab(["saved", "x"])).toBe("mine");
  });
});

describe("ListsSection", () => {
  it("marca la pestaña activa, muestra los totales y enlaza a Comunidad", () => {
    renderSection("saved");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(screen.getByRole("tab", { name: /^Guardadass*4$/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Mis listass*14$/ })).toHaveAttribute("aria-selected", "false");
    for (const link of screen.getAllByRole("link", { name: "Descubrir en Comunidad →" })) {
      expect(link).toHaveAttribute("href", "/lists");
    }
    expect(screen.getByRole("tabpanel")).toHaveTextContent("panel");
  });

  it("Guardadas enlaza a su ?tab= y Mis listas a la raíz", () => {
    renderSection("mine");
    expect(screen.getByRole("tab", { name: /^Guardadass*4$/ })).toHaveAttribute("href", "/me/lists?tab=saved");
    expect(screen.getByRole("tab", { name: /^Mis listass*14$/ })).toHaveAttribute("href", "/me/lists");
  });

  // openspec: redesign-me-lists-toolbar
  it("Nueva lista abre un diálogo y, creada desde Guardadas, pasa a Mis listas", async () => {
    renderSection("saved");
    await userEvent.click(screen.getByRole("button", { name: "Nueva lista" }));
    expect(screen.getByRole("dialog", { name: "Nueva lista" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "crear" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.push).toHaveBeenCalledWith("/me/lists");
  });

  it("?new=1 abre el diálogo al cargar", () => {
    renderSection("mine", <p>panel</p>, true);
    expect(screen.getByRole("dialog", { name: "Nueva lista" })).toBeInTheDocument();
  });
});
