import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import UnsubscribePage from "./page";

const mocks = vi.hoisted(() => ({ isValidUnsubscribeToken: vi.fn() }));

vi.mock("@/services/notifications/unsubscribe", () => ({
  isValidUnsubscribeToken: mocks.isValidUnsubscribeToken,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
// El servidor traduce con `getTranslations`; en el test basta la clave.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

function renderPage(query: { token?: string }) {
  return UnsubscribePage({ searchParams: Promise.resolve(query) }).then((tree) =>
    renderWithIntl(tree),
  );
}

describe("página de baja del resumen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("con un token válido pide confirmar antes de dar de baja", async () => {
    mocks.isValidUnsubscribeToken.mockReturnValue(true);

    await renderPage({ token: "abc.def" });

    expect(mocks.isValidUnsubscribeToken).toHaveBeenCalledWith("abc.def");
    expect(screen.getByRole("heading", { name: "Darte de baja del resumen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Darte de baja" })).toBeInTheDocument();
  });

  it("un token inválido no ofrece confirmar y enlaza a los ajustes", async () => {
    mocks.isValidUnsubscribeToken.mockReturnValue(false);

    await renderPage({ token: "roto" });

    expect(screen.getByRole("heading", { name: "unsubscribePage.invalidTitle" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Darte de baja" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "unsubscribePage.goToSettings" })).toHaveAttribute(
      "href",
      "/me/settings/notifications",
    );
  });

  it("sin token tampoco confirma nada", async () => {
    mocks.isValidUnsubscribeToken.mockReturnValue(false);

    await renderPage({});

    expect(screen.getByRole("heading", { name: "unsubscribePage.invalidTitle" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
