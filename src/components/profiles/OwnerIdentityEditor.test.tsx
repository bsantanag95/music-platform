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

    await user.type(screen.getByLabelText("Bio"), "Colecciono casetes");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByLabelText("Bio")).toHaveValue("Colecciono casetes");
  });

  describe("pronombres (spec profile-personal-info)", () => {
    const select = () => screen.getByLabelText("Pronombres") as HTMLSelectElement;
    const other = () => screen.getByLabelText("Tus pronombres") as HTMLInputElement;
    const example = () => screen.getByText("Ejemplo").parentElement!;
    const sentBody = () => JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string);

    it("ofrece sin especificar, la lista cerrada y «Otro»", () => {
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);
      expect(Array.from(select().options).map((option) => option.text)).toEqual([
        "Sin especificar",
        "Él",
        "Ella",
        "Elle",
        "Otro…",
      ]);
      expect(select()).toHaveValue("none");
    });

    it("sin pronombres el ejemplo usa la forma neutra y lo dice", () => {
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} name="Ana" />);
      expect(example()).toHaveTextContent("Ana agregó Pride a su lista de «Pendientes». Lo escuchó por primera vez esta semana.");
      expect(example()).toHaveTextContent("la interfaz usa la forma neutra");
    });

    it("el ejemplo cambia en vivo con la opción y usa el nombre visible", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} name="Fran" />);

      await user.selectOptions(select(), "she");
      expect(example()).toHaveTextContent("Fran agregó Pride a su lista de «Pendientes». Ella lo escuchó");
      expect(example()).not.toHaveTextContent("neutra");

      await user.selectOptions(select(), "they");
      expect(example()).toHaveTextContent("Elle lo escuchó");

      await user.selectOptions(select(), "he");
      expect(example()).toHaveTextContent("Él lo escuchó");
    });

    it("en inglés el ejemplo usa el posesivo que corresponde", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} name="Ana" />, "en");
      const englishSelect = screen.getByLabelText("Pronouns") as HTMLSelectElement;
      const englishExample = () => screen.getByText("Example").parentElement!;

      await user.selectOptions(englishSelect, "she");
      expect(englishExample()).toHaveTextContent("Ana added Pride to her want-to-listen list.");
      await user.selectOptions(englishSelect, "they");
      expect(englishExample()).toHaveTextContent("Ana added Pride to their want-to-listen list.");
      await user.selectOptions(englishSelect, "he");
      expect(englishExample()).toHaveTextContent("Ana added Pride to his want-to-listen list.");
    });

    it("«Otro» muestra su campo, usa la forma neutra y NO deja guardar sin texto", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

      await user.selectOptions(select(), "other");
      expect(other()).toBeInTheDocument();
      expect(example()).toHaveTextContent("la interfaz usa la forma neutra");
      expect(screen.getByText("Escribí tus pronombres para poder guardar.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

      await user.type(other(), "ellx");
      expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
      expect(screen.queryByText("Escribí tus pronombres para poder guardar.")).not.toBeInTheDocument();
    });

    it("«Otro» limita el texto a 40 caracteres", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);
      await user.selectOptions(select(), "other");
      expect(other()).toHaveAttribute("maxlength", "40");
    });

    it("guardar una clave de la lista envía la clave y borra el texto libre", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ user: {} });
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

      await user.selectOptions(select(), "she");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      expect(sentBody()).toMatchObject({ pronounSet: "she", pronouns: null });
    });

    it("guardar «Otro» envía el texto recortado", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ user: {} });
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

      await user.selectOptions(select(), "other");
      await user.type(other(), "  ellx  ");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      expect(sentBody()).toMatchObject({ pronounSet: "other", pronouns: "ellx" });
    });

    it("volver a «Sin especificar» envía null en los dos campos", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ user: {} });
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, pronounSet: "he" }} />);
      expect(select()).toHaveValue("he");

      await user.selectOptions(select(), "none");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      expect(sentBody()).toMatchObject({ pronounSet: null, pronouns: null });
    });

    it("un texto libre anterior a la lista arranca como «Otro» con ese texto", () => {
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, pronouns: "she/they" }} />);
      expect(select()).toHaveValue("other");
      expect(other()).toHaveValue("she/they");
      // Sin tocar nada no hay cambios que guardar.
      expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    });

    it("la clave de la lista manda sobre un texto libre guardado", () => {
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, pronounSet: "they", pronouns: null }} />);
      expect(select()).toHaveValue("they");
      expect(screen.queryByLabelText("Tus pronombres")).not.toBeInTheDocument();
    });

    it("cambiar de opción y volver a la original no cuenta como cambio sin guardar", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, pronounSet: "she" }} />);
      await user.selectOptions(select(), "he");
      expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
      await user.selectOptions(select(), "she");
      expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    });
  });

  describe("país y ciudad o región (spec profile-personal-info)", () => {
    const country = () => screen.getByRole("combobox", { name: "País" }) as HTMLInputElement;
    const sentBody = () => JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string);

    it("el país es un combobox con buscador y la ubicación se llama «Ciudad o región»", () => {
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);
      expect(country()).toHaveAttribute("aria-autocomplete", "list");
      expect(country()).toHaveAttribute("placeholder", "Sin país");
      expect(screen.getByLabelText("Ciudad o región")).toBeInTheDocument();
      expect(screen.queryByLabelText("Ubicación")).not.toBeInTheDocument();
    });

    it("avisa quién ve estos datos", () => {
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);
      expect(screen.getByText("Solo lo ven quienes pueden ver tu perfil.")).toBeInTheDocument();
    });

    it("muestra el país guardado por su nombre", () => {
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, country: "CL" }} />);
      expect(country()).toHaveValue("Chile");
    });

    it("un código guardado que no está en la lista se muestra como sin país", () => {
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, country: "ZZ" }} />);
      expect(country()).toHaveValue("");
    });

    it("guarda el código elegido con el buscador y la ciudad en un solo PATCH", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ user: {} });
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

      await user.click(country());
      await user.type(country(), "mexico");
      await user.click(screen.getByRole("option", { name: "México" }));
      await user.type(screen.getByLabelText("Ciudad o región"), "Oaxaca");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
      expect(sentBody()).toMatchObject({ country: "MX", location: "Oaxaca" });
    });

    it("«Sin país» borra el país y habilita guardar", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ user: {} });
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, country: "CL" }} />);
      expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

      await user.click(country());
      await user.click(screen.getByRole("option", { name: "Sin país" }));
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      expect(sentBody()).toMatchObject({ country: "" });
    });
  });
});
