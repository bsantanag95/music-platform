import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { SaveListButton } from "./SaveListButton";
import { ApiError } from "@/lib/api/client";

const mocks = vi.hoisted(() => ({ saveList: vi.fn(), unsaveList: vi.fn() }));
vi.mock("@/lib/api/lists", () => ({ saveList: mocks.saveList, unsaveList: mocks.unsaveList }));

const listId = "a1b2c3d4-0000-4000-8000-000000000001";

describe("SaveListButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda con following=false y luego muestra Seguir", async () => {
    mocks.saveList.mockResolvedValue({});
    renderWithIntl(<SaveListButton listId={listId} initialSaved={false} initialFollowing={false} />);

    expect(screen.queryByRole("button", { name: "Seguir" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(mocks.saveList).toHaveBeenCalledWith(listId, false);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardada" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
  });

  it("alterna Seguir sobre una lista guardada", async () => {
    mocks.saveList.mockResolvedValue({});
    renderWithIntl(<SaveListButton listId={listId} initialSaved initialFollowing={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Seguir" }));
    expect(mocks.saveList).toHaveBeenCalledWith(listId, true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Siguiendo" })).toBeInTheDocument());
  });

  it("hace rollback y muestra error si falla el guardado", async () => {
    mocks.saveList.mockRejectedValue(new Error("boom"));
    renderWithIntl(<SaveListButton listId={listId} initialSaved={false} initialFollowing={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("quita el guardado y avisa al padre", async () => {
    mocks.unsaveList.mockResolvedValue(null);
    const onChange = vi.fn();
    renderWithIntl(
      <SaveListButton listId={listId} initialSaved initialFollowing onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Guardada" }));
    expect(mocks.unsaveList).toHaveBeenCalledWith(listId);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ saved: false, following: false }));
  });

  it("no marca error si el guardado ya no existe (LIST_NOT_FOUND)", async () => {
    mocks.saveList.mockRejectedValue(new ApiError("LIST_NOT_FOUND", 404, "x"));
    renderWithIntl(<SaveListButton listId={listId} initialSaved={false} initialFollowing={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(mocks.saveList).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
