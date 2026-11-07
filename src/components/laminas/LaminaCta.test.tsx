import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { LaminaCta } from "./LaminaCta";

const ID = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";

describe("LaminaCta", () => {
  it("sin sesión lleva al registro y ofrece entrar, con la intención", () => {
    renderWithIntl(<LaminaCta laminaId={ID} signedIn={false} />);
    expect(screen.getByRole("link", { name: "Arma la tuya" })).toHaveAttribute("href", `/auth/register?lamina=${ID}`);
    expect(screen.getByRole("link", { name: "Ya tengo cuenta" })).toHaveAttribute("href", `/auth/login?lamina=${ID}`);
  });

  it("con sesión lleva directo al formulario", () => {
    renderWithIntl(<LaminaCta laminaId={ID} signedIn />);
    expect(screen.getByRole("link", { name: "Arma la tuya" })).toHaveAttribute("href", `/me/laminas?desde=${ID}`);
    expect(screen.queryByRole("link", { name: "Ya tengo cuenta" })).toBeNull();
  });
});
