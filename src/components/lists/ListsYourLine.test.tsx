import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { ListsYourLine } from "./ListsYourLine";

vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("./ListCoverMosaic", () => ({ ListCoverMosaic: () => <span data-testid="mosaic" /> }));

describe("ListsYourLine", () => {
  it("con una lista para retomar: mosaico, rótulo y título en un solo enlace; los accesos aparte", async () => {
    render(
      await ListsYourLine({
        resume: { id: "l1", title: "Glam Metal Bands", entityType: "artist", itemCount: 1, coverThumbUrls: [] },
      }),
    );

    const nav = screen.getByRole("navigation", { name: "community.rail.yourListsTitle" });
    const resume = within(nav).getByRole("link", { name: /Glam Metal Bands/ });
    expect(resume).toHaveAttribute("href", "/me/lists/l1");
    expect(resume).toHaveTextContent("community.reader.resumeLabel");
    expect(within(resume).getByTestId("mosaic")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /community.rail.myLists/ })).toHaveAttribute("href", "/me/lists");
    expect(within(nav).getByRole("link", { name: /community.rail.saved/ })).toHaveAttribute("href", "/me/lists?tab=saved");
  });

  it("sin listas propias invita a crear la primera", async () => {
    render(await ListsYourLine({ resume: null }));

    expect(screen.getByText("community.reader.noLists")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /community.rail.createFirst/ })).toHaveAttribute("href", "/me/lists?new=1");
  });
});
