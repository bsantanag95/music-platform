import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { DefaultAudienceSettings } from "./DefaultAudienceSettings";

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

beforeEach(() => vi.clearAllMocks());

const profileWith = (defaultAudience: string | null) => ({ user: { defaultAudience } });
const bodyOfCall = (index = 0) => JSON.parse((mocks.apiFetch.mock.calls[index]![2] as RequestInit).body as string);

describe("DefaultAudienceSettings", () => {
  it("ofrece las cuatro opciones y aclara que solo afecta al contenido nuevo", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience={null} />);

    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: /Según el tipo/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Privado/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Seguidores/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Público/ })).toBeInTheDocument();
    expect(screen.getByText(/No cambia lo que ya tenés/)).toBeInTheDocument();
  });

  it("aclara que las reseñas y los comentarios no dependen de la preferencia (son públicos)", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);
    expect(
      screen.getByText(/Las reseñas y los comentarios no dependen de esta preferencia/),
    ).toBeInTheDocument();
  });

  it("sin preferencia arranca en 'Según el tipo'", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience={null} />);
    expect(screen.getByRole("radio", { name: /Según el tipo/ })).toBeChecked();
  });

  it("refleja la preferencia guardada", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience="followers" />);
    expect(screen.getByRole("radio", { name: /Seguidores/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Según el tipo/ })).not.toBeChecked();
  });

  it("elegir una audiencia la guarda vía PATCH /api/me/profile", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(profileWith("public"));
    renderWithIntl(<DefaultAudienceSettings initialAudience={null} />);

    await user.click(screen.getByRole("radio", { name: /Público/ }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/profile");
    expect((init as RequestInit).method).toBe("PATCH");
    expect(bodyOfCall()).toEqual({ defaultAudience: "public" });
    expect(await screen.findByText("Guardado")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Público/ })).toBeChecked();
  });

  it("volver a 'Según el tipo' envía null", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(profileWith(null));
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(screen.getByRole("radio", { name: /Según el tipo/ }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    expect(bodyOfCall()).toEqual({ defaultAudience: null });
    expect(screen.getByRole("radio", { name: /Según el tipo/ })).toBeChecked();
  });

  it("elegir la opción ya activa no hace ninguna petición", async () => {
    const user = userEvent.setup();
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(screen.getByRole("radio", { name: /Privado/ }));

    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("ante un error muestra la alerta y conserva la elección anterior", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("INTERNAL_ERROR", 500, "x"));
    renderWithIntl(<DefaultAudienceSettings initialAudience="followers" />);

    await user.click(screen.getByRole("radio", { name: /Público/ }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Seguidores/ })).toBeChecked();
    expect(screen.queryByText("Guardado")).not.toBeInTheDocument();
  });
});
