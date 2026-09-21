import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerPromptsEditor } from "./OwnerPromptsEditor";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return { apiFetch: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

const first = { promptKey: "first-record" as const, answer: "Un casete de Los Prisioneros", position: 0 };
const sunday = { promptKey: "sunday-record" as const, answer: "Kind of Blue, sin apuro", position: 1 };

const save = () => screen.getByRole("button", { name: "Guardar" });
const add = () => screen.queryByRole("button", { name: "Agregar pregunta" });

beforeEach(() => vi.clearAllMocks());

describe("OwnerPromptsEditor", () => {
  it("muestra las respuestas guardadas en su orden y el botón guardar deshabilitado", () => {
    renderWithIntl(<OwnerPromptsEditor initial={[sunday, first]} />);
    const answers = screen.getAllByLabelText("Respuesta") as HTMLInputElement[];
    // Se ordena por posición, no por el orden en que llegaron.
    expect(answers.map((input) => input.value)).toEqual(["Un casete de Los Prisioneros", "Kind of Blue, sin apuro"]);
    expect(save()).toBeDisabled();
  });

  it("agregar una pregunta ofrece la primera libre y llega hasta el máximo de 3", async () => {
    const user = userEvent.setup();
    renderWithIntl(<OwnerPromptsEditor initial={[]} />);

    for (let i = 0; i < 3; i++) await user.click(add()!);

    expect(screen.getAllByLabelText("Pregunta")).toHaveLength(3);
    expect(add()).not.toBeInTheDocument();
  });

  it("cada selector solo ofrece las preguntas que no eligió otra fila (sin repetidas)", () => {
    renderWithIntl(<OwnerPromptsEditor initial={[first, sunday]} />);
    const [firstSelect] = screen.getAllByLabelText("Pregunta") as HTMLSelectElement[];
    const options = [...firstSelect!.options].map((option) => option.textContent);
    expect(options).toContain("El primer disco que compré");
    expect(options).not.toContain("Lo que pongo un domingo");
  });

  it("cambiar la pregunta de una fila no pierde el foco ni lo escrito", async () => {
    const user = userEvent.setup();
    renderWithIntl(<OwnerPromptsEditor initial={[first]} />);
    const select = screen.getByLabelText("Pregunta");
    await user.selectOptions(select, "Un disco para un viaje");
    expect(screen.getByLabelText("Respuesta")).toHaveValue("Un casete de Los Prisioneros");
    expect(screen.getByLabelText("Pregunta")).toHaveValue("road-trip-record");
  });

  it("el contador de la respuesta llega a 100 y no deja escribir más", async () => {
    const user = userEvent.setup();
    renderWithIntl(<OwnerPromptsEditor initial={[{ ...first, answer: "" }]} />);
    const input = screen.getByLabelText("Respuesta") as HTMLInputElement;
    expect(input).toHaveAttribute("maxLength", "100");
    await user.type(input, "x".repeat(120));
    expect(input.value).toHaveLength(100);
    expect(screen.getByText("100/100")).toBeInTheDocument();
  });

  it("guarda el conjunto completo con PUT, recortado y en el orden de la pantalla", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ prompts: [first, sunday] });
    const onSaved = vi.fn();
    renderWithIntl(<OwnerPromptsEditor initial={[first]} onSaved={onSaved} />);

    await user.click(add()!);
    await user.type(screen.getAllByLabelText("Respuesta")[1]!, "  Kind of Blue, sin apuro  ");
    await user.click(save());

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    const [path, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/me/profile/prompts");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      prompts: [
        { promptKey: "first-record", answer: "Un casete de Los Prisioneros" },
        { promptKey: "sunday-record", answer: "Kind of Blue, sin apuro" },
      ],
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Guardado");
    expect(onSaved).toHaveBeenCalled();
  });

  it("una respuesta vacía no se envía y explica qué hacer", async () => {
    const user = userEvent.setup();
    renderWithIntl(<OwnerPromptsEditor initial={[first]} />);
    await user.click(add()!);
    // La fila nueva está vacía; el conjunto cambió, así que guardar está habilitado.
    await user.click(save());

    expect(await screen.findByRole("alert")).toHaveTextContent("Escribí una respuesta o quitá la pregunta.");
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("quitar una pregunta la saca del conjunto que se guarda", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ prompts: [sunday] });
    renderWithIntl(<OwnerPromptsEditor initial={[first, sunday]} />);

    await user.click(screen.getByRole("button", { name: "Quitar la pregunta «El primer disco que compré»" }));
    await user.click(save());

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const body = JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string);
    expect(body.prompts).toEqual([{ promptKey: "sunday-record", answer: "Kind of Blue, sin apuro" }]);
  });

  it("quitar todas las preguntas guarda un conjunto vacío", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ prompts: [] });
    renderWithIntl(<OwnerPromptsEditor initial={[first]} />);
    await user.click(screen.getByRole("button", { name: /Quitar la pregunta/ }));
    await user.click(save());
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    expect(JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string)).toEqual({ prompts: [] });
  });

  it("ante un error del servidor conserva lo escrito y permite reintentar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR"));
    renderWithIntl(<OwnerPromptsEditor initial={[first]} />);
    await user.type(screen.getByLabelText("Respuesta"), " más");
    await user.click(save());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Respuesta")).toHaveValue("Un casete de Los Prisioneros más");
    expect(save()).toBeEnabled();
  });

  it("informa al anfitrión de los cambios sin guardar", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    renderWithIntl(<OwnerPromptsEditor initial={[first]} onDirtyChange={onDirtyChange} />);
    await user.type(screen.getByLabelText("Respuesta"), "!");
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });
});
