import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { HomeReleases } from "./HomeReleases";
import type { HomeRelease } from "@/services/home/home";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const release = (id: string): HomeRelease => ({
  id,
  title: `Disco ${id}`,
  artist: "Banda",
  coverThumbUrl: "https://example.com/cover.jpg",
  releaseDate: "2026-10-01",
  section: "recent",
  badge: null,
});

describe("HomeReleases", () => {
  it("sin sesión muestra solo la selección popular, sin selector", async () => {
    renderWithIntl(await HomeReleases({ releases: [release("x1")] }));
    expect(screen.getByText("Disco x1")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  // openspec: redesign-signed-in-home-phase3
  it("con sesión usa el horario (Recientes/Próximos), sin flechas", async () => {
    renderWithIntl(
      await HomeReleases({ releases: [release("x1")], personalReleases: [release("p1"), release("p2"), release("p3")] }),
    );
    expect(screen.getByRole("heading", { name: /^Recientes/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /lanzamientos anteriores|más lanzamientos/ })).toBeNull();
  });

  it("sin sesión y sin lanzamientos no se muestra el apartado", async () => {
    const { container } = renderWithIntl(await HomeReleases({ releases: [] }));
    expect(container).toBeEmptyDOMElement();
  });

  it("con sesión y al menos 3 discos propios abre en «De tus artistas» sin invitación", async () => {
    renderWithIntl(
      await HomeReleases({
        releases: [release("x1")],
        personalReleases: [release("p1"), release("p2"), release("p3")],
      }),
    );
    expect(screen.getByRole("tab", { name: "De tus artistas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Disco p1")).toBeInTheDocument();
    expect(document.querySelector("[data-release-hint]")).toBeNull();
  });

  it("con sesión y menos de 3 discos propios abre en «Populares» con la invitación", async () => {
    renderWithIntl(await HomeReleases({ releases: [release("x1")], personalReleases: [release("p1"), release("p2")] }));
    expect(screen.getByRole("tab", { name: "Populares" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Disco x1")).toBeInTheDocument();
    expect(document.querySelector("[data-release-hint]")).not.toBeNull();
  });

  it("con sesión, sin calendario y sin discos propios no se muestra el apartado", async () => {
    const { container } = renderWithIntl(await HomeReleases({ releases: [], personalReleases: [] }));
    expect(container).toBeEmptyDOMElement();
  });
});
