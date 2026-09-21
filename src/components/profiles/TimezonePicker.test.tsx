import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { filterTimezones, TimezonePicker } from "./TimezonePicker";

function Harness({ initial = "", onChange = vi.fn() }: { initial?: string; onChange?: (zone: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <TimezonePicker
        id="tz"
        label="Zona horaria"
        value={value}
        onChange={(zone) => {
          setValue(zone);
          onChange(zone);
        }}
      />
    </form>
  );
}

const box = () => screen.getByRole("combobox", { name: "Zona horaria" }) as HTMLInputElement;
const options = () => screen.queryAllByRole("option").map((option) => option.textContent);

describe("filterTimezones", () => {
  it("sin búsqueda devuelve todas, en orden alfabético", () => {
    const all = filterTimezones("");
    expect(all.length).toBeGreaterThan(300);
    expect(all).toContain("America/Santiago");
    expect(all).toEqual([...all].sort());
  });

  it("no distingue mayúsculas ni tildes", () => {
    expect(filterTimezones("SANTIAGO")).toContain("America/Santiago");
    expect(filterTimezones("bogotá")).toContain("America/Bogota");
  });

  it("los guiones bajos y las barras cuentan como espacios: 'buenos aires' encuentra Buenos_Aires", () => {
    expect(filterTimezones("buenos aires")).toContain("America/Buenos_Aires");
    expect(filterTimezones("sao paulo")).toContain("America/Sao_Paulo");
  });

  it("cada palabra tiene que aparecer: la región y la ciudad juntas acotan", () => {
    const result = filterTimezones("america santiago");
    expect(result).toContain("America/Santiago");
    expect(result.every((zone) => zone.startsWith("America/") || zone.includes("Santiago"))).toBe(true);
    expect(filterTimezones("europe santiago")).toEqual([]);
  });

  it("las zonas cuya ciudad EMPIEZA por la búsqueda van primero", () => {
    const city = (zone: string) => zone.slice(zone.lastIndexOf("/") + 1).toLowerCase();
    const result = filterTimezones("ant");
    // Hay de las dos clases (ciudad que empieza por "ant" y zonas que solo lo contienen).
    const firstOther = result.findIndex((zone) => !city(zone).startsWith("ant"));
    expect(firstOther).toBeGreaterThan(0);
    expect(result.slice(0, firstOther).every((zone) => city(zone).startsWith("ant"))).toBe(true);
    expect(result.slice(firstOther).every((zone) => !city(zone).startsWith("ant"))).toBe(true);
  });

  it("sin coincidencias devuelve una lista vacía", () => {
    expect(filterTimezones("zzzzqqq")).toEqual([]);
  });
});

describe("TimezonePicker", () => {
  it("cerrado muestra la zona elegida, o el texto de 'sin zona'", () => {
    const { unmount } = renderWithIntl(<Harness initial="America/Santiago" />);
    expect(box()).toHaveValue("America/Santiago");
    expect(box()).toHaveAttribute("aria-expanded", "false");
    unmount();

    renderWithIntl(<Harness />);
    expect(box()).toHaveValue("");
    expect(box()).toHaveAttribute("placeholder", "Sin zona horaria");
  });

  it("al enfocar abre la lista con 'Sin zona horaria' primero y encabezados de región", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(box());

    expect(box()).toHaveAttribute("aria-expanded", "true");
    expect(options()[0]).toBe("Sin zona horaria");
    expect(screen.getByRole("status")).toHaveTextContent(/zonas$/);
    // Los encabezados de región separan las zonas (no son opciones).
    expect(screen.getByRole("listbox").textContent).toContain("Europe");
  });

  it("escribir filtra la lista y anuncia cuántas zonas coinciden", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(box());
    await user.type(box(), "santiago");

    expect(options()).toContain("America/Santiago");
    expect(options()).not.toContain("Europe/Madrid");
    expect(options()).not.toContain("Sin zona horaria");
    expect(screen.getByRole("status")).toHaveTextContent(/^\d+ zonas?$/);
  });

  it("sin coincidencias lo dice en vez de dejar la lista vacía", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(box());
    await user.type(box(), "zzzzqqq");

    expect(options()).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent("Ninguna zona coincide con «zzzzqqq».");
  });

  it("elegir una opción con el clic la aplica, cierra la lista y limpia la búsqueda", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(<Harness onChange={onChange} />);
    await user.click(box());
    await user.type(box(), "madrid");
    await user.click(screen.getByRole("option", { name: "Europe/Madrid" }));

    expect(onChange).toHaveBeenCalledWith("Europe/Madrid");
    expect(box()).toHaveValue("Europe/Madrid");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("con teclado: flechas mueven la opción activa y Enter elige (sin enviar el formulario)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const submit = vi.fn((event: Event) => event.preventDefault());
    renderWithIntl(<Harness onChange={onChange} />);
    document.querySelector("form")!.addEventListener("submit", submit);

    await user.click(box());
    await user.type(box(), "tokyo");
    expect(box()).toHaveAttribute("aria-activedescendant");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("Asia/Tokyo");
    expect(submit).not.toHaveBeenCalled();
  });

  it("las flechas recorren las opciones y actualizan aria-activedescendant", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(box());
    await user.type(box(), "par");

    const first = box().getAttribute("aria-activedescendant");
    await user.keyboard("{ArrowDown}");
    const second = box().getAttribute("aria-activedescendant");
    expect(second).not.toBe(first);
    await user.keyboard("{ArrowUp}");
    expect(box().getAttribute("aria-activedescendant")).toBe(first);
  });

  it("'Sin zona horaria' quita la zona", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(<Harness initial="America/Santiago" onChange={onChange} />);
    await user.click(box());
    await user.click(screen.getByRole("option", { name: "Sin zona horaria" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(box()).toHaveValue("");
  });

  it("la opción elegida está marcada y la lista abre sobre ella", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness initial="Europe/Madrid" />);
    await user.click(box());
    expect(screen.getByRole("option", { name: "Europe/Madrid" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "America/Santiago" })).toHaveAttribute("aria-selected", "false");
    expect(box().getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Europe/Madrid" }).id);
  });

  it("Escape cierra solo la lista y no se propaga (el panel que la aloja no se cierra)", async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    document.addEventListener("keydown", outer);
    renderWithIntl(<Harness initial="Europe/Madrid" />);
    await user.click(box());
    await user.keyboard("{Escape}");
    document.removeEventListener("keydown", outer);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(outer).not.toHaveBeenCalled();
    expect(box()).toHaveValue("Europe/Madrid");
  });

  it("Escape frena también a los listeners del mismo nodo (en Next la raíz de React es `document`)", async () => {
    const user = userEvent.setup();
    const immediate = vi.spyOn(Event.prototype, "stopImmediatePropagation");
    renderWithIntl(<Harness initial="Europe/Madrid" />);
    await user.click(box());
    await user.keyboard("{Escape}");

    expect(immediate).toHaveBeenCalled();
    immediate.mockRestore();
  });

  it("Escape con la lista cerrada sí llega al panel", async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    document.addEventListener("keydown", outer);
    renderWithIntl(<Harness />);
    box().focus();
    await user.keyboard("{Escape}{Escape}");
    document.removeEventListener("keydown", outer);
    // El primer Escape cierra la lista abierta por el foco; el segundo ya no hay lista.
    expect(outer).toHaveBeenCalled();
  });

  it("al perder el foco cierra la lista sin cambiar la zona y descarta lo escrito", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <>
        <Harness initial="Europe/Madrid" />
        <button type="button">otro</button>
      </>,
    );
    await user.click(box());
    await user.type(box(), "tok");
    await user.click(screen.getByRole("button", { name: "otro" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(box()).toHaveValue("Europe/Madrid");
  });

  it("la lista está etiquetada con el nombre del campo", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Harness />);
    await user.click(box());
    expect(within(screen.getByRole("listbox", { name: "Zona horaria" })).getAllByRole("option").length).toBeGreaterThan(0);
  });
});
