import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Greeting } from "./Greeting";
import { renderWithIntl } from "@/test/i18n-test-utils";

afterEach(() => {
  vi.useRealTimers();
});

describe("Greeting", () => {
  it("corrige el saludo usando la hora local del navegador", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 21));

    renderWithIntl(
      <Greeting
        initialKey="greetingMorning"
        morning="Buenos días"
        afternoon="Buenas tardes"
        evening="Buenas noches"
      />,
    );

    expect(screen.getByText("Buenas noches")).toBeInTheDocument();
  });
});
