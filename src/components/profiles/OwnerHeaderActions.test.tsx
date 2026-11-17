import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { OwnerHeaderActions } from "./OwnerHeaderActions";

const ownerEdit = vi.hoisted(() => ({ value: null as null | { editing: boolean; setEditing: (v: boolean) => void } }));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("./OwnerEditProvider", () => ({ useOwnerEdit: () => ownerEdit.value }));

describe("OwnerHeaderActions", () => {
  it("fuera del proveedor (visitante, previsualización) no dibuja nada", () => {
    ownerEdit.value = null;
    const { container } = render(<OwnerHeaderActions username="ana" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sin modo edición: «Editar perfil» sin pulsar y «Ver como visitante» a la previsualización", () => {
    const setEditing = vi.fn();
    ownerEdit.value = { editing: false, setEditing };
    render(<OwnerHeaderActions username="ana" />);
    const toggle = screen.getByRole("button", { name: "ownerHeader.edit" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("link", { name: "ownerHeader.viewAsVisitor" })).toHaveAttribute(
      "href",
      "/users/ana?preview=1",
    );
    fireEvent.click(toggle);
    expect(setEditing).toHaveBeenCalledWith(true);
  });

  it("con modo edición: «Listo» pulsado, que lo desactiva, sin «Ver como visitante»", () => {
    const setEditing = vi.fn();
    ownerEdit.value = { editing: true, setEditing };
    render(<OwnerHeaderActions username="ana" />);
    const toggle = screen.getByRole("button", { name: "ownerHeader.done" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("link", { name: "ownerHeader.viewAsVisitor" })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(setEditing).toHaveBeenCalledWith(false);
  });
});
