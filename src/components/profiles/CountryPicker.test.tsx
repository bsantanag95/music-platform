import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { COUNTRIES } from "@/lib/personal-info";
import { CountryPicker } from "./CountryPicker";

function Harness({ initial = "", onChange = vi.fn() }: { initial?: string; onChange?: (code: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <CountryPicker
        id="country"
        label="País"
        value={value}
        onChange={(code) => {
          setValue(code);
          onChange(code);
        }}
      />
    </form>
  );
}

const box = () => screen.getByRole("combobox", { name: "País" }) as HTMLInputElement;
const options = () => screen.queryAllByRole("option").map((option) => option.textContent);

describe("CountryPicker", () => {
  it("cerrado muestra el NOMBRE del país elegido (no el código), o «Sin país»", () => {
    const { unmount } = renderWithIntl(<Harness initial="CL" />);
    expect(box()).toHaveValue("Chile");
    expect(box()).toHaveAttribute("aria-expanded", "false");
    unmount();

    renderWithIntl(<Harness />);
    expect(box()).toHaveValue("");
    expect(box()).toHaveAttribute("placeholder", "Sin país");
  });

  it("los nombres salen en el idioma de la interfaz", () => {
    renderWithIntl(<Harness initial="ES" />, "en");
    expect(screen.getByRole("combobox")).toHaveValue("Spain");
  });

  it("al enfocar abre la lista con «Sin país» primero y todos los países", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(box());

    expect(box()).toHaveAttribute("aria-expanded", "true");
    expect(options()[0]).toBe("Sin país");
    expect(options()).toHaveLength(COUNTRIES.length + 1);
    expect(screen.getByRole("status")).toHaveTextContent(`${COUNTRIES.length} países`);
  });

  it.each(["mexico", "méxico", "MÉXICO", "Mexico"])("escribir «%s» encuentra México", async (query) => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(box());
    await user.type(box(), query);

    expect(options()).toContain("México");
    expect(options()).not.toContain("Chile");
    expect(options()).not.toContain("Sin país");
  });

  it("anuncia cuántos países coinciden", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(box());
    await user.type(box(), "chile");

    expect(options()).toEqual(["Chile"]);
    expect(screen.getByRole("status")).toHaveTextContent("1 país");
  });

  it("sin coincidencias lo dice en vez de dejar la lista vacía", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(box());
    await user.type(box(), "zzzzqqq");

    expect(options()).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent("Ningún país coincide con «zzzzqqq».");
  });

  it("elegir con el clic aplica el CÓDIGO, cierra la lista y muestra el nombre", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(<Harness onChange={onChange} />);
    await user.click(box());
    await user.type(box(), "argentina");
    await user.click(screen.getByRole("option", { name: "Argentina" }));

    expect(onChange).toHaveBeenCalledWith("AR");
    expect(box()).toHaveValue("Argentina");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("con teclado: Enter elige la opción activa sin enviar el formulario", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const submit = vi.fn((event: Event) => event.preventDefault());
    renderWithIntl(<Harness onChange={onChange} />);
    document.querySelector("form")!.addEventListener("submit", submit);

    await user.click(box());
    await user.type(box(), "peru");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("PE");
    expect(submit).not.toHaveBeenCalled();
  });

  it("«Sin país» borra el país", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(<Harness initial="CL" onChange={onChange} />);
    await user.click(box());
    await user.click(screen.getByRole("option", { name: "Sin país" }));

    expect(onChange).toHaveBeenCalledWith("");
    expect(box()).toHaveValue("");
  });

  it("Escape cierra solo la lista y no llega al panel que la aloja", async () => {
    const user = userEvent.setup();
    const panelEscape = vi.fn();
    document.addEventListener("keydown", panelEscape);
    renderWithIntl(<Harness />);
    await user.click(box());
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(panelEscape).not.toHaveBeenCalled();
    document.removeEventListener("keydown", panelEscape);
  });

  it("el país elegido figura seleccionado al reabrir la lista", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness initial="CL" />);
    await user.click(box());

    expect(screen.getByRole("option", { name: "Chile" })).toHaveAttribute("aria-selected", "true");
  });
});
