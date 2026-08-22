import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ReactionPicker } from "./ReactionPicker";
import type { ListenReaction } from "@/lib/api/schemas";

function renderPicker(value: ListenReaction | null, onChange = vi.fn(), name = "r", locale: "es" | "en" = "es") {
  return renderWithIntl(<ReactionPicker value={value} onChange={onChange} name={name} />, locale);
}

describe("ReactionPicker", () => {
  it("ofrece ausencia de dato y las cinco reacciones de la taxonomía", () => {
    renderPicker(null);
    expect(screen.getByRole("radio", { name: "Sin reacción" })).toBeChecked();
    for (const label of ["Me gustó", "Me encantó", "Obsesión", "Neutro", "No me gustó"]) {
      expect(screen.getByRole("radio", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it("marca neutral como elegido cuando se selecciona", () => {
    renderPicker("neutral");
    expect(screen.getByRole("radio", { name: "Neutro" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Sin reacción" })).not.toBeChecked();
  });

  it("marca ausencia de dato como elegida cuando no hay reacción", () => {
    renderPicker(null);
    expect(screen.getByRole("radio", { name: "Sin reacción" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Neutro" })).not.toBeChecked();
  });

  it("notifica el cambio al seleccionar una reacción", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker(null, onChange);
    await user.click(screen.getByRole("radio", { name: "Me encantó" }));
    expect(onChange).toHaveBeenCalledWith("loved");
  });

  it("traduce las etiquetas en inglés", () => {
    renderPicker("liked", vi.fn(), "r", "en");
    expect(screen.getByRole("radio", { name: "Like it" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "No reaction" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Didn't click" })).toBeInTheDocument();
  });
});