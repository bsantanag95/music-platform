import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
import { YearInvitationCard } from "./YearInvitationCard";

afterEach(() => {
  document.cookie = "year_invite_dismissed=; path=/; max-age=0";
});

describe("YearInvitationCard", () => {
  it("en diciembre invita al año en curso, hasta ahora, y enlaza al año propio", () => {
    renderWithIntl(<YearInvitationCard username="ana b" year={2026} inProgress />);
    expect(screen.getByRole("heading", { name: "Tu 2026 en discos, hasta ahora" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver tu año" })).toHaveAttribute("href", "/users/ana%20b/year/2026");
  });

  it("en enero, el año ya cerrado", () => {
    renderWithIntl(<YearInvitationCard username="ana" year={2026} inProgress={false} />);
    expect(screen.getByRole("heading", { name: "Tu 2026 en discos está listo" })).toBeInTheDocument();
  });

  it("descartar la oculta y guarda el año en la cookie", () => {
    renderWithIntl(<YearInvitationCard username="ana" year={2026} inProgress />);
    fireEvent.click(screen.getByRole("button", { name: "Descartar la invitación de 2026" }));
    expect(screen.queryByRole("heading")).toBeNull();
    expect(document.cookie).toContain("year_invite_dismissed=2026");
  });
});
