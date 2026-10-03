import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { LoginPanel } from "./LoginPanel";
import { SocialSignIn } from "./SocialSignIn";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const checkboxLabel = "Mantener la sesión iniciada en este dispositivo";

describe("SocialSignIn", () => {
  it("sin la elección (registro) enlaza al inicio del flujo solo con el locale", () => {
    renderWithIntl(<SocialSignIn locale="es" label="Continuar con Google" separator="o" />);
    expect(screen.getByRole("link", { name: /Continuar con Google/ })).toHaveAttribute(
      "href",
      "/api/auth/google/start?locale=es",
    );
  });

  it("con remember=false añade remember=0", () => {
    renderWithIntl(<SocialSignIn locale="en" label="Continue" separator="or" remember={false} />);
    expect(screen.getByRole("link", { name: /Continue/ })).toHaveAttribute(
      "href",
      "/api/auth/google/start?locale=en&remember=0",
    );
  });
});

describe("LoginPanel", () => {
  it("el botón de Google refleja la casilla de mantener la sesión", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LoginPanel locale="es" googleLabel="Continuar con Google" separator="o" />);
    const google = screen.getByRole("link", { name: /Continuar con Google/ });
    expect(screen.getByLabelText(checkboxLabel)).toBeChecked();
    expect(google).toHaveAttribute("href", "/api/auth/google/start?locale=es");

    await user.click(screen.getByLabelText(checkboxLabel));
    expect(google).toHaveAttribute("href", "/api/auth/google/start?locale=es&remember=0");

    await user.click(screen.getByLabelText(checkboxLabel));
    expect(google).toHaveAttribute("href", "/api/auth/google/start?locale=es");
  });
});
