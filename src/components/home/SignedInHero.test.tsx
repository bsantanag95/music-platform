import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { SignedInHero } from "./SignedInHero";
import { greetingKey } from "./greeting-key";
import type { FeedListenEntry } from "@/services/feed/feed";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  ),
  getLocale: vi.fn().mockResolvedValue("es"),
  getFormatter: vi.fn().mockResolvedValue({ relativeTime: () => "hace 5 días" }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// Los hijos async (Server Components) y los clientes con red se reemplazan: la composición es lo
// que se prueba aquí; cada uno tiene sus pruebas.
vi.mock("./QuickLinks", () => ({ QuickLinks: () => <nav data-testid="quick-links" /> }));
vi.mock("./HomeLogField", () => ({ HomeLogField: ({ labelledBy }: { labelledBy: string }) => <input data-testid="log-field" aria-labelledby={labelledBy} /> }));
vi.mock("./LastTouchCard", () => ({ LastTouchCard: () => <article data-testid="last-touch" /> }));
vi.mock("./Greeting", () => ({ Greeting: ({ initialKey }: { initialKey: string }) => <span>{initialKey}</span> }));
vi.mock("@/components/auth/EmailVerificationNotice", () => ({
  EmailVerificationNotice: ({ variant }: { variant: string }) => <p data-testid="email-notice">{variant}</p>,
}));

const listen = {
  kind: "listen",
  id: "l1",
  createdAt: "2026-11-12T10:00:00Z",
  target: { type: "release-group", id: "a1", title: "Too Fast for Love", artistName: "Mötley Crüe", coverThumbUrl: null },
} as unknown as FeedListenEntry;

const base = { name: "@yo", username: "yo", ownRating: null, onboardingPending: false, emailVerified: true };

async function render(props: Partial<Parameters<typeof SignedInHero>[0]> = {}) {
  renderWithIntl(await SignedInHero({ ...base, lastTouch: listen, ...props }));
}

describe("SignedInHero", () => {
  it("con actividad: saludo, titular como h1, campo rotulado por el titular, accesos y «Última vez»", async () => {
    const now = new Date(2026, 10, 17, 22);
    await render({ now });
    expect(screen.getByText(greetingKey(now))).toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 1, name: "heroTitle" });
    expect(screen.getByTestId("log-field")).toHaveAttribute("aria-labelledby", heading.id);
    expect(screen.getByText("logFieldHint")).toBeInTheDocument();
    expect(screen.getByTestId("quick-links")).toBeInTheDocument();
    expect(screen.getByTestId("last-touch")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@yo" })).toHaveAttribute("href", "/users/yo");
    expect(screen.queryByText("welcomeEyebrow")).not.toBeInTheDocument();
  });

  it("sin actividad y con onboarding pendiente: bienvenida y los dos caminos en prosa", async () => {
    await render({ lastTouch: null, onboardingPending: true });
    expect(screen.getByText("welcomeEyebrow")).toBeInTheDocument();
    expect(screen.getByText("welcomeHint")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "welcomeFindPeople" })).toHaveAttribute("href", "/users");
    expect(screen.getByRole("link", { name: "welcomeCompleteProfile" })).toHaveAttribute("href", "/welcome");
    expect(screen.queryByTestId("last-touch")).not.toBeInTheDocument();
  });

  it("sin actividad y con el onboarding hecho: sin enlace al perfil musical", async () => {
    await render({ lastTouch: null, onboardingPending: false });
    expect(screen.queryByRole("link", { name: "welcomeCompleteProfile" })).not.toBeInTheDocument();
  });

  it("el aviso de email va en línea solo sin verificar", async () => {
    await render({ emailVerified: false });
    expect(screen.getByTestId("email-notice")).toHaveTextContent("inline");
  });

  it("con el email verificado no hay aviso", async () => {
    await render({ emailVerified: true });
    expect(screen.queryByTestId("email-notice")).not.toBeInTheDocument();
  });
});
