import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerIdentityEditor } from "./OwnerIdentityEditor";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return { apiFetch: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

const emptyInitial = { bio: null, pronouns: null, location: null, timezone: null };

beforeEach(() => vi.clearAllMocks());

describe("OwnerIdentityEditor", () => {
  it("guarda los campos recortados vía PATCH", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ user: {} });
    renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

    await user.type(screen.getByLabelText("Bio"), "Colecciono casetes");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const body = JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string);
    expect(body).toMatchObject({ bio: "Colecciono casetes" });
    expect(screen.getByRole("status")).toHaveTextContent("Guardado");
  });

  it("el botón guardar arranca deshabilitado sin cambios", () => {
    renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, bio: "hola" }} />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  describe("zona horaria y hora local", () => {
    const zone = () => screen.getByRole("combobox", { name: "Zona horaria" }) as HTMLInputElement;
    const showTime = () => screen.getByLabelText("Mostrar mi hora local en el perfil") as HTMLInputElement;

    // Elige una zona con el buscador: escribe y pulsa la opción.
    async function pick(user: ReturnType<typeof userEvent.setup>, search: string, zoneName: string) {
      await user.click(zone());
      await user.type(zone(), search);
      await user.click(screen.getByRole("option", { name: zoneName }));
    }

    it("la zona es un combobox con buscador de zonas IANA, no texto libre", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);
      expect(zone()).toHaveAttribute("aria-autocomplete", "list");
      expect(zone()).toHaveAttribute("placeholder", "Sin zona horaria");

      await user.click(zone());
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(300);
      expect(screen.getByRole("option", { name: "America/Santiago" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Europe/Madrid" })).toBeInTheDocument();
    });

    it("sin zona la opción de hora local está deshabilitada y lo explica", () => {
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);
      expect(showTime()).toBeDisabled();
      expect(showTime()).not.toBeChecked();
      expect(screen.getByText("Elegí una zona horaria para poder mostrar tu hora local.")).toBeInTheDocument();
    });

    it("guarda la zona elegida con el buscador y la hora local en un solo PATCH", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ user: {} });
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

      await pick(user, "santiago", "America/Santiago");
      expect(zone()).toHaveValue("America/Santiago");
      expect(showTime()).toBeEnabled();
      await user.click(showTime());
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      const body = JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string);
      expect(body).toMatchObject({ timezone: "America/Santiago", showLocalTime: true });
    });

    it("mostrar la hora es un cambio pendiente que habilita guardar", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, timezone: "America/Santiago" }} />);
      expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
      await user.click(showTime());
      expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    });

    it("quitar la zona ('Sin zona horaria') apaga la hora local y no la envía activada", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ user: {} });
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, timezone: "America/Santiago", showLocalTime: true }} />);
      expect(showTime()).toBeChecked();

      await user.click(zone());
      await user.click(screen.getByRole("option", { name: "Sin zona horaria" }));
      expect(showTime()).not.toBeChecked();
      expect(showTime()).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      const body = JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string);
      expect(body).toMatchObject({ timezone: "", showLocalTime: false });
    });

    it("una zona guardada que no es válida (dato anterior) se muestra como sin zona", () => {
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, timezone: "hora de mi casa", showLocalTime: true }} />);
      expect(zone()).toHaveValue("");
      expect(showTime()).not.toBeChecked();
    });
  });

  it("ante un error conserva el texto y muestra la alerta", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR", 400, "x"));
    renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

    await user.type(screen.getByLabelText("Pronombres"), "elle");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByLabelText("Pronombres")).toHaveValue("elle");
  });
});
