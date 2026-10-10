import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("@/i18n/navigation", () => ({ usePathname: () => mocks.pathname }));

import { FooterSlot } from "./FooterSlot";

function renderSlot(pathname: string) {
  mocks.pathname = pathname;
  render(<FooterSlot full={<p>pie completo</p>} minimal={<p>pie mínimo</p>} />);
}

describe("FooterSlot", () => {
  it("muestra el pie completo en el resto del sitio", () => {
    renderSlot("/album/abc");

    expect(screen.getByText("pie completo")).toBeInTheDocument();
    expect(screen.queryByText("pie mínimo")).not.toBeInTheDocument();
  });

  it("muestra el pie mínimo en la bienvenida", () => {
    renderSlot("/welcome");

    expect(screen.getByText("pie mínimo")).toBeInTheDocument();
    expect(screen.queryByText("pie completo")).not.toBeInTheDocument();
  });
});
