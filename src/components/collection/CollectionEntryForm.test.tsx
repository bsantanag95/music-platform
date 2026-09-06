import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import {
  CollectionEntryForm,
  EMPTY_ENTRY_FORM,
  type CollectionEntryFormValue,
} from "./CollectionEntryForm";

// Arnés controlado: mantiene el valor en estado como lo haría el consumidor real.
function Harness({
  onValue,
  showAudience,
  initial = EMPTY_ENTRY_FORM,
}: {
  onValue?: (value: CollectionEntryFormValue) => void;
  showAudience?: boolean;
  initial?: CollectionEntryFormValue;
}) {
  const [value, setValue] = useState(initial);
  return (
    <CollectionEntryForm
      value={value}
      showAudience={showAudience}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

describe("CollectionEntryForm", () => {
  it("emite el cambio de formato", async () => {
    const onValue = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<Harness onValue={onValue} />);
    await user.selectOptions(screen.getByLabelText("Formato"), "cd");
    expect(onValue).toHaveBeenCalledWith(expect.objectContaining({ format: "cd" }));
  });

  it("agrega y quita atributos", async () => {
    const onValue = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<Harness onValue={onValue} />);
    await user.click(screen.getByText("Edición limitada"));
    expect(onValue).toHaveBeenLastCalledWith(
      expect.objectContaining({ attributes: ["limited-edition"] }),
    );
    await user.click(screen.getByText("Edición limitada"));
    expect(onValue).toHaveBeenLastCalledWith(expect.objectContaining({ attributes: [] }));
  });

  it("respeta el límite de 140 caracteres de la nota", () => {
    renderWithIntl(<Harness />);
    expect(screen.getByLabelText("Nota")).toHaveAttribute("maxlength", "140");
  });

  it("sin showAudience no muestra los controles de audiencia", () => {
    renderWithIntl(<Harness />);
    expect(screen.queryByText("Audiencia")).not.toBeInTheDocument();
  });

  it("con showAudience permite elegir la audiencia", async () => {
    const onValue = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<Harness onValue={onValue} showAudience />);
    expect(screen.getByText("Audiencia")).toBeInTheDocument();
    await user.click(screen.getByText("Privado"));
    expect(onValue).toHaveBeenLastCalledWith(expect.objectContaining({ audience: "private" }));
  });
});
