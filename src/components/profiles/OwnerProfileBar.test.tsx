import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { EditableBlock } from "./EditableBlock";
import { OwnerEditProvider } from "./OwnerEditProvider";
import { OwnerProfileBar } from "./OwnerProfileBar";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    // jsdom no implementa la navegación: se cancela el clic para no ensuciar la salida.
    <a href={href} onClick={(event) => event.preventDefault()} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => vi.clearAllMocks());

function renderBar(visibility: "public" | "private" = "public") {
  return renderWithIntl(
    <OwnerEditProvider>
      <OwnerProfileBar username="an a" visibility={visibility} />
      <EditableBlock label="Placa" editor={<div>editor</div>}>
        <p>vista</p>
      </EditableBlock>
    </OwnerEditProvider>,
  );
}

describe("OwnerProfileBar", () => {
  it("fuera del proveedor (visitante o previsualización) no renderiza nada", () => {
    const { container } = renderWithIntl(<OwnerProfileBar username="ana" visibility="public" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("el chip muestra la visibilidad y enlaza a la pantalla de Privacidad", () => {
    renderBar("public");
    const chip = screen.getByRole("link", { name: /Perfil público/ });
    expect(chip).toHaveAttribute("href", "/me/settings/privacy");
    expect(chip).toHaveTextContent("Ajustes");
  });

  it("con perfil privado el chip lo indica", () => {
    renderBar("private");
    expect(screen.getByRole("link", { name: /Perfil privado/ })).toBeInTheDocument();
  });

  it("'Ver cómo te ven' lleva a la previsualización con el username codificado", () => {
    renderBar();
    expect(screen.getByRole("link", { name: "Ver cómo te ven" })).toHaveAttribute(
      "href",
      "/users/an%20a?preview=1",
    );
  });

  it("el interruptor empieza desactivado y muestra los lápices al activarlo", async () => {
    const user = userEvent.setup();
    renderBar();
    const toggle = screen.getByRole("switch", { name: "Editar perfil" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("button", { name: "Editar Placa" })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Editar Placa" })).toBeInTheDocument();
  });

  it("el interruptor se activa con teclado", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("switch", { name: "Editar perfil" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("switch", { name: "Editar perfil" })).toHaveAttribute("aria-checked", "true");
  });

  it("chip y enlace de previsualización no cambian ningún ajuste ni activan el modo edición", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("link", { name: /Perfil público/ }));
    expect(screen.getByRole("switch", { name: "Editar perfil" })).toHaveAttribute("aria-checked", "false");
  });
});
