import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerLinksEditor } from "./OwnerLinksEditor";
import type { ProfileLink } from "@/lib/api/schemas";

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

const stored = (kind: ProfileLink["kind"], url: string, id: string = kind): ProfileLink => ({ id, kind, url, position: 0 });
const bodyOfCall = (index = 0) => JSON.parse((mocks.apiFetch.mock.calls[index]![2] as RequestInit).body as string);

async function addRow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Agregar enlace" }));
}

describe("OwnerLinksEditor", () => {
  it("agrega una fila, la completa y la envía como { kind, value } (sin filas vacías)", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ links: [] });
    renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);

    await addRow(user);
    await addRow(user); // una fila vacía que no debe enviarse
    await user.type(screen.getAllByLabelText("Dirección web")[0]!, "https://ana.example");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    expect(bodyOfCall()).toEqual({ links: [{ kind: "other", value: "https://ana.example" }] });
  });

  it("una fila nueva empieza como Enlace", async () => {
    const user = userEvent.setup();
    renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
    await addRow(user);
    expect(screen.getByLabelText("Tipo")).toHaveValue("other");
  });

  it("desactiva 'agregar' al llegar a 5 enlaces", () => {
    const links: ProfileLink[] = Array.from({ length: 5 }, (_, i) => stored("other", `https://x${i}.example`, `l${i}`));
    renderWithIntl(<OwnerLinksEditor initialLinks={links} />);
    expect(screen.getByRole("button", { name: "Agregar enlace" })).toBeDisabled();
    expect(screen.getByText("Llegaste al máximo de 5 enlaces")).toBeInTheDocument();
  });

  it("quita una fila", async () => {
    const user = userEvent.setup();
    renderWithIntl(<OwnerLinksEditor initialLinks={[stored("bandcamp", "https://a.bandcamp.com")]} />);

    // Un enlace guardado de un tipo por usuario se edita como su usuario, no como URL.
    expect(screen.getByLabelText("Usuario o enlace")).toHaveValue("a");
    await user.click(screen.getByRole("button", { name: "Quitar enlace" }));
    expect(screen.queryByLabelText("Usuario o enlace")).not.toBeInTheDocument();
  });

  describe("sin validación nativa del navegador", () => {
    it("el formulario desactiva la validación nativa y el campo no es type=url", async () => {
      const user = userEvent.setup();
      const { container } = renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);

      expect(container.querySelector("form")).toHaveAttribute("novalidate");
      const input = screen.getByLabelText("Dirección web");
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("inputmode", "url");
      expect(input).toHaveAttribute("autocapitalize", "off");
      expect(input).toHaveAttribute("spellcheck", "false");
    });

    it("www.link.com en Enlace se envía tal cual, sin ningún error", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ links: [stored("other", "https://www.link.com")] });
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);

      await user.type(screen.getByLabelText("Dirección web"), "www.link.com");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
      expect(bodyOfCall()).toEqual({ links: [{ kind: "other", value: "www.link.com" }] });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("muestra la vista previa con https:// añadido para una dirección sin esquema", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);

      await user.type(screen.getByLabelText("Dirección web"), "www.link.com");

      // La vista previa quita el esquema y el www para mostrarlo compacto.
      expect(screen.getByText("Se guardará como link.com")).toBeInTheDocument();
    });
  });

  describe("tipos por usuario", () => {
    it("pide el usuario y muestra la vista previa del enlace resultante", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.selectOptions(screen.getByLabelText("Tipo"), "instagram");

      expect(screen.getByLabelText("Usuario o enlace")).toHaveAttribute("placeholder", "@usuario");
      await user.type(screen.getByLabelText("Usuario o enlace"), "@ana");

      expect(screen.getByText("Se guardará como instagram.com/ana")).toBeInTheDocument();
    });

    it("envía el valor escrito y el servidor devuelve el enlace canónico, que se muestra como usuario", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ links: [stored("instagram", "https://www.instagram.com/ana")] });
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.selectOptions(screen.getByLabelText("Tipo"), "instagram");

      await user.type(screen.getByLabelText("Usuario o enlace"), "https://instagram.com/ana?igsh=1");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      expect(bodyOfCall()).toEqual({ links: [{ kind: "instagram", value: "https://instagram.com/ana?igsh=1" }] });
      await waitFor(() => expect(screen.getByLabelText("Usuario o enlace")).toHaveValue("ana"));
    });

    it("cada tipo nuevo (X, TikTok, Spotify) está en el selector", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);

      const options = [...screen.getByLabelText("Tipo").querySelectorAll("option")].map((o) => o.textContent);
      expect(options).toEqual(expect.arrayContaining(["Enlace", "Instagram", "X", "TikTok", "Spotify"]));
      // Sitio web se unificó en Enlace: ya no es un tipo.
      expect(options).not.toContain("Sitio web");
    });

    it("muestra la ayuda específica de YouTube, Bandcamp, Discogs y Spotify", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);

      await user.selectOptions(screen.getByLabelText("Tipo"), "discogs");
      expect(screen.getByText(/no una página de artista o de sello/)).toBeInTheDocument();
      await user.selectOptions(screen.getByLabelText("Tipo"), "youtube");
      expect(screen.getByText(/no el enlace del canal/)).toBeInTheDocument();
    });
  });

  describe("errores por fila", () => {
    it("un enlace de otro sitio bloquea el guardado con el error de la fila y no envía nada", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.selectOptions(screen.getByLabelText("Tipo"), "instagram");
      await user.type(screen.getByLabelText("Usuario o enlace"), "https://tiktok.com/@ana");

      await user.click(screen.getByRole("button", { name: "Guardar" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Ese enlace no es de Instagram. Escribí solo tu usuario de Instagram.");
      expect(mocks.apiFetch).not.toHaveBeenCalled();
      // El error está asociado al campo para las tecnologías de asistencia.
      const input = screen.getByLabelText("Usuario o enlace");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input.getAttribute("aria-describedby")).toBe(alert.id);
      expect(input).toHaveFocus();
    });

    it("la portada del sitio pide el usuario", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.selectOptions(screen.getByLabelText("Tipo"), "instagram");
      await user.type(screen.getByLabelText("Usuario o enlace"), "instagram.com");

      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Falta tu usuario de Instagram");
    });

    it("una dirección inválida en Enlace pide una dirección válida", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.type(screen.getByLabelText("Dirección web"), "hola");

      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Escribí una dirección web válida");
    });

    it("un esquema no web se rechaza", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.type(screen.getByLabelText("Dirección web"), "javascript:alert(1)");

      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Solo se aceptan direcciones web");
      expect(mocks.apiFetch).not.toHaveBeenCalled();
    });

    it("el error no aparece mientras la persona todavía escribe, sí al salir del campo", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.type(screen.getByLabelText("Dirección web"), "hola");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await user.tab();

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("las demás filas conservan lo escrito cuando una es inválida", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await addRow(user);
      await user.type(screen.getAllByLabelText("Dirección web")[0]!, "ana.example");
      await user.type(screen.getAllByLabelText("Dirección web")[1]!, "hola");

      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await screen.findByRole("alert");
      expect(screen.getAllByLabelText("Dirección web")[0]).toHaveValue("ana.example");
      expect(mocks.apiFetch).not.toHaveBeenCalled();
    });

    it("corregir la fila y guardar envía el conjunto completo", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ links: [stored("other", "https://ana.example")] });
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.type(screen.getByLabelText("Dirección web"), "hola");
      await user.click(screen.getByRole("button", { name: "Guardar" }));
      await screen.findByRole("alert");

      await user.clear(screen.getByLabelText("Dirección web"));
      await user.type(screen.getByLabelText("Dirección web"), "ana.example");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
      expect(bodyOfCall()).toEqual({ links: [{ kind: "other", value: "ana.example" }] });
    });
  });

  describe("cambiar el tipo de una fila", () => {
    it("conserva el texto y revalida: la vista previa pasa a la nueva red", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.selectOptions(screen.getByLabelText("Tipo"), "instagram");
      await user.type(screen.getByLabelText("Usuario o enlace"), "ana");
      expect(screen.getByText("Se guardará como instagram.com/ana")).toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText("Tipo"), "tiktok");

      expect(screen.getByLabelText("Usuario o enlace")).toHaveValue("ana");
      expect(screen.getByText("Se guardará como tiktok.com/@ana")).toBeInTheDocument();
    });

    it("un texto que dejó de ser válido para el nuevo tipo se marca al cambiar", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
      await addRow(user);
      await user.type(screen.getByLabelText("Dirección web"), "www.link.com");

      await user.selectOptions(screen.getByLabelText("Tipo"), "instagram");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Ese enlace no es de Instagram");
    });
  });

  describe("enlaces guardados que no coinciden con su tipo", () => {
    const legacy = stored("instagram", "http://instagram.com");

    it("se muestran con su URL guardada y un aviso", () => {
      renderWithIntl(<OwnerLinksEditor initialLinks={[legacy]} />);

      expect(screen.getByLabelText("Usuario o enlace")).toHaveValue("http://instagram.com");
      expect(screen.getByText(/Este enlace no coincide con Instagram/)).toBeInTheDocument();
    });

    it("guardar sin modificarlo se bloquea con un error que pide su usuario", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OwnerLinksEditor initialLinks={[legacy]} />);

      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Falta tu usuario de Instagram");
      expect(mocks.apiFetch).not.toHaveBeenCalled();
    });

    it("quitar la fila y guardar guarda los demás enlaces", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ links: [stored("other", "https://ana.example")] });
      renderWithIntl(
        <OwnerLinksEditor initialLinks={[legacy, stored("other", "https://ana.example")]} />,
      );

      await user.click(screen.getAllByRole("button", { name: "Quitar enlace" })[0]!);
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      expect(bodyOfCall()).toEqual({ links: [{ kind: "other", value: "https://ana.example" }] });
    });

    it("corregirlo con su usuario permite guardar y quita el aviso", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ links: [stored("instagram", "https://www.instagram.com/ana")] });
      renderWithIntl(<OwnerLinksEditor initialLinks={[legacy]} />);

      await user.clear(screen.getByLabelText("Usuario o enlace"));
      await user.type(screen.getByLabelText("Usuario o enlace"), "ana");

      expect(screen.queryByText(/Este enlace no coincide/)).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
      expect(bodyOfCall()).toEqual({ links: [{ kind: "instagram", value: "ana" }] });
    });

    it("un enlace coherente no muestra ningún aviso", () => {
      renderWithIntl(<OwnerLinksEditor initialLinks={[stored("instagram", "https://www.instagram.com/ana")]} />);
      expect(screen.queryByText(/Este enlace no coincide/)).not.toBeInTheDocument();
      expect(screen.getByLabelText("Usuario o enlace")).toHaveValue("ana");
    });
  });

  it("un error del servidor conserva lo escrito y muestra la alerta", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR", 400, "x"));
    renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);
    await addRow(user);
    await user.type(screen.getByLabelText("Dirección web"), "ana.example");

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Dirección web")).toHaveValue("ana.example");
  });
});
