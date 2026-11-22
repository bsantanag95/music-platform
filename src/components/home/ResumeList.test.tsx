import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ResumeList } from "./ResumeList";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: { count?: number }) =>
    values?.count != null ? `${key}:${values.count}` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const list = { id: "list1", title: "2000 Rock/Metal", entityType: "release-group" as const, itemCount: 4, coverThumbUrls: [] };

// openspec: redesign-signed-in-home-phase3
describe("ResumeList", () => {
  it("en fila lleva el rótulo, el título, la cantidad y el enlace a la lista, sin encabezado de sección", async () => {
    renderWithIntl(await ResumeList({ list, variant: "row" }));
    const link = screen.getByRole("link", { name: /2000 Rock\/Metal/ });
    expect(link).toHaveAttribute("href", "/me/lists/list1");
    expect(link).toHaveTextContent("resumeListLabel");
    expect(link).toHaveTextContent("resumeListItemCount:4");
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("como sección lleva su encabezado y el acceso a todas las listas", async () => {
    renderWithIntl(await ResumeList({ list }));
    expect(screen.getByRole("heading", { name: "resumeListLabel" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /resumeListSeeAll/ })).toHaveAttribute("href", "/me/lists");
  });

  it("sin lista no renderiza nada", async () => {
    expect(await ResumeList({ list: null })).toBeNull();
  });
});
