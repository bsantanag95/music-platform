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

describe("OwnerLinksEditor", () => {
  it("agrega una fila, la completa y la envía (sin filas vacías)", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ links: [] });
    renderWithIntl(<OwnerLinksEditor initialLinks={[]} />);

    await user.click(screen.getByRole("button", { name: "Agregar enlace" }));
    await user.type(screen.getByLabelText("URL"), "https://ana.example");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const body = JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string);
    expect(body).toEqual({ links: [{ kind: "website", url: "https://ana.example" }] });
  });

  it("desactiva 'agregar' al llegar a 5 enlaces", () => {
    const links: ProfileLink[] = Array.from({ length: 5 }, (_, i) => ({
      id: `l${i}`,
      kind: "other",
      url: `https://x${i}.example`,
      position: i,
    }));
    renderWithIntl(<OwnerLinksEditor initialLinks={links} />);
    expect(screen.getByRole("button", { name: "Agregar enlace" })).toBeDisabled();
    expect(screen.getByText("Llegaste al máximo de 5 enlaces")).toBeInTheDocument();
  });

  it("quita una fila", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <OwnerLinksEditor
        initialLinks={[{ id: "l1", kind: "bandcamp", url: "https://a.bandcamp.com", position: 0 }]}
      />,
    );
    expect(screen.getByLabelText("URL")).toHaveValue("https://a.bandcamp.com");
    await user.click(screen.getByRole("button", { name: "Quitar enlace" }));
    expect(screen.queryByLabelText("URL")).not.toBeInTheDocument();
  });
});
