import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Logo } from "./Logo";
import { renderWithIntl } from "@/test/i18n-test-utils";
import commonEs from "../../../messages/es/common.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Logo", () => {
  it("enlaza a la página de inicio", () => {
    renderWithIntl(<Logo />);

    expect(screen.getByRole("link", { name: commonEs.home })).toHaveAttribute("href", "/");
  });
});
