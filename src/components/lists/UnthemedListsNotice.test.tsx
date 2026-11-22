import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { UnthemedListsNotice } from "./UnthemedListsNotice";

const mocks = vi.hoisted(() => ({ getMyLists: vi.fn(), updateList: vi.fn() }));
vi.mock("@/lib/api/lists", () => mocks);

function renderNotice(count: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <UnthemedListsNotice count={count} />
    </QueryClientProvider>,
  );
}

// Aviso de clasificación de /me/lists (openspec: add-list-themes-phase1).
describe("UnthemedListsNotice", () => {
  it("sin listas por clasificar no se muestra ni consulta", () => {
    const { container } = renderNotice(0);
    expect(container).toBeEmptyDOMElement();
    expect(mocks.getMyLists).not.toHaveBeenCalled();
  });

  it("pide las listas sin tema y guarda el tema elegido con un toque, sin preselección", async () => {
    mocks.getMyLists.mockResolvedValue({ lists: [{ id: "l1", title: "Best AOR songs" }], page: 1, pageSize: 5, hasNext: false });
    mocks.updateList.mockResolvedValue({});
    renderNotice(3);

    expect(screen.getByRole("heading", { name: "3 de tus listas no tienen tema" })).toBeInTheDocument();
    expect(await screen.findByText("Best AOR songs")).toBeInTheDocument();
    expect(mocks.getMyLists).toHaveBeenCalledWith(1, 5, { theme: "none" });
    for (const radio of screen.getAllByRole("radio")) expect(radio).not.toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Ranking personal" }));
    expect(mocks.updateList).toHaveBeenCalledWith("l1", { theme: "personal_ranking" });
  });
});
