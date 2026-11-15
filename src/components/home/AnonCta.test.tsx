import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { AnonCta } from "./AnonCta";

vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("AnonCta", () => {
  it("con el descubrimiento habilitado ofrece crear cuenta y explorar", async () => {
    render(await AnonCta({ exploreEnabled: true }));

    expect(screen.getByRole("link", { name: "heroSignUp" })).toHaveAttribute("href", "/auth/register");
    expect(screen.getByRole("link", { name: "closingExplore" })).toHaveAttribute("href", "/explore");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("con el descubrimiento deshabilitado no enlaza a /explore", async () => {
    render(await AnonCta({ exploreEnabled: false }));

    expect(screen.getByRole("link", { name: "heroSignUp" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "closingExplore" })).not.toBeInTheDocument();
  });
});
