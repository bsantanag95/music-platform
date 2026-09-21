import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { SignInCard } from "./SignInCard";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return { apiFetch: vi.fn(), ApiError, refresh: vi.fn() };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.apiFetch.mockResolvedValue(null);
});

describe("SignInCard", () => {
  it("una cuenta con contraseña y Google vinculado puede cambiar la contraseña y desvincular", () => {
    renderWithIntl(<SignInCard hasPassword googleLinked flash={null} />);
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desvincular" })).toBeEnabled();
  });

  it("una cuenta de Google sin contraseña ve 'Crear contraseña' y no puede desvincular", () => {
    renderWithIntl(<SignInCard hasPassword={false} googleLinked flash={null} />);

    expect(screen.getByRole("button", { name: "Crear contraseña" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar contraseña" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desvincular" })).toBeDisabled();
    expect(screen.getByText(/Es tu único método de acceso/)).toBeInTheDocument();
  });

  it("sin Google vinculado ofrece vincular con el flujo de la intención link", () => {
    renderWithIntl(<SignInCard hasPassword googleLinked={false} flash={null} />);
    const link = screen.getByRole("link", { name: "Vincular" });
    expect(link).toHaveAttribute("href", "/api/auth/google/start?intent=link&locale=es");
    expect(screen.queryByRole("button", { name: "Desvincular" })).not.toBeInTheDocument();
  });

  it("desvincular pide confirmación y cancelar no llama a la API", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SignInCard hasPassword googleLinked flash={null} />);

    await user.click(screen.getByRole("button", { name: "Desvincular" }));
    expect(await screen.findByRole("dialog", { name: "Desvincular Google" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("confirmar desvincula Google y lo avisa", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SignInCard hasPassword googleLinked flash={null} />);
    await user.click(screen.getByRole("button", { name: "Desvincular" }));

    const dialog = await screen.findByRole("dialog", { name: "Desvincular Google" });
    await user.click(within(dialog).getByRole("button", { name: "Desvincular" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Google desvinculada.");
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/me/account/identities/google",
      expect.anything(),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(screen.getByRole("link", { name: "Vincular" })).toBeInTheDocument();
  });

  it("si la API rechaza desvincular muestra el error localizado", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("LAST_ACCESS_METHOD"));
    renderWithIntl(<SignInCard hasPassword googleLinked flash={null} />);
    await user.click(screen.getByRole("button", { name: "Desvincular" }));
    const dialog = await screen.findByRole("dialog", { name: "Desvincular Google" });
    await user.click(within(dialog).getByRole("button", { name: "Desvincular" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Creá una contraseña antes de desvincular Google/);
  });

  it("muestra el resultado del flujo de Google al volver a Ajustes", () => {
    const { unmount } = renderWithIntl(<SignInCard hasPassword googleLinked flash={{ kind: "linked" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Google quedó vinculada a tu cuenta.");
    unmount();

    renderWithIntl(<SignInCard hasPassword googleLinked flash={{ kind: "error", code: "OAUTH_IDENTITY_TAKEN" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("ya está vinculada a otra cuenta");
  });

  it("consume el aviso del flujo de Google: lo quita de la URL para que una recarga no lo repita", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    window.history.pushState({}, "", "/es/me/settings/account?google=linked");

    renderWithIntl(<SignInCard hasPassword googleLinked flash={{ kind: "linked" }} />);

    expect(replaceState).toHaveBeenCalledWith(expect.anything(), "", "/es/me/settings/account");
    expect(window.location.search).toBe("");
    // El aviso sigue visible en esta carga; solo desaparece de la URL.
    expect(screen.getByRole("status")).toHaveTextContent("Google quedó vinculada a tu cuenta.");
    replaceState.mockRestore();
  });

  it("sin aviso no toca la URL", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderWithIntl(<SignInCard hasPassword googleLinked flash={null} />);
    expect(replaceState).not.toHaveBeenCalled();
    replaceState.mockRestore();
  });

  it("desvincular reemplaza el aviso de 'vinculada' por el de 'desvinculada' (nunca los dos)", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SignInCard hasPassword googleLinked flash={{ kind: "linked" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Google quedó vinculada");

    await user.click(screen.getByRole("button", { name: "Desvincular" }));
    const dialog = await screen.findByRole("dialog", { name: "Desvincular Google" });
    await user.click(within(dialog).getByRole("button", { name: "Desvincular" }));

    expect(await screen.findByText("Google desvinculada.")).toBeInTheDocument();
    expect(screen.queryByText("Google quedó vinculada a tu cuenta.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vincular" })).toBeInTheDocument();
  });

  it("un código de error inesperado del flujo no rompe la pantalla", () => {
    renderWithIntl(<SignInCard hasPassword googleLinked flash={{ kind: "error", code: "ALGO_NUEVO" }} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
