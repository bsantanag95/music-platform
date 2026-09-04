import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { WelcomePanel, greetingKey, lastTouchKey } from "./WelcomePanel";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { FeedComment, FeedRating } from "@/services/feed/feed";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getFormatter: vi.fn().mockResolvedValue({ relativeTime: () => "hace 2 días" }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ label }: { label: string }) => <span data-testid="cover-thumb">{label}</span>,
}));

// QuickLinks es en sí mismo un Server Component async: si se deja sin
// resolver como hijo de WelcomePanel, el render de testing-library (que no
// sabe recorrer RSC anidados, a diferencia del pipeline real de Next.js) lo
// ignora. Su propio comportamiento se cubre en QuickLinks.test.tsx.
vi.mock("@/components/home/QuickLinks", () => ({
  QuickLinks: () => <nav data-testid="quick-links" />,
}));

const rating: FeedRating = {
  kind: "rating",
  id: "r1",
  stars: "4.5",
  detailedScore: null,
  createdAt: "2026-08-01T00:00:00Z",
  target: { type: "release-group", id: "rg1", title: "Currents", artistName: "Tame Impala", coverThumbUrl: null },
  author: { id: "u1", username: "yo", displayName: null },
};

const comment: FeedComment = {
  kind: "comment",
  id: "c1",
  body: "Producción impecable.",
  createdAt: "2026-08-01T00:00:00Z",
  target: { type: "artist", id: "a1", title: "Tame Impala", artistName: null, coverThumbUrl: null },
  author: { id: "u1", username: "yo", displayName: null },
};

describe("greetingKey", () => {
  it("elige el saludo según la hora", () => {
    expect(greetingKey(new Date(2026, 0, 1, 6))).toBe("greetingMorning");
    expect(greetingKey(new Date(2026, 0, 1, 11, 59))).toBe("greetingMorning");
    expect(greetingKey(new Date(2026, 0, 1, 12))).toBe("greetingAfternoon");
    expect(greetingKey(new Date(2026, 0, 1, 18, 59))).toBe("greetingAfternoon");
    expect(greetingKey(new Date(2026, 0, 1, 19))).toBe("greetingEvening");
    expect(greetingKey(new Date(2026, 0, 1, 23))).toBe("greetingEvening");
  });
});

describe("lastTouchKey", () => {
  it("mapea cada tipo de entrada a su clave", () => {
    expect(lastTouchKey("listen")).toBe("lastTouchListen");
    expect(lastTouchKey("rating")).toBe("lastTouchRating");
    expect(lastTouchKey("comment")).toBe("lastTouchComment");
  });
});

describe("WelcomePanel", () => {
  it("sin actividad: muestra el nudge y no el callout de última vez", async () => {
    const ui = await WelcomePanel({
      name: "Fran",
      username: "fran",
      lastActivity: null,
      now: new Date(2026, 0, 1, 9),
    });
    renderWithIntl(ui);

    expect(screen.getByText("greetingMorning")).toBeInTheDocument();
    expect(screen.getByText("lastTouchEmpty")).toBeInTheDocument();
    expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
  });

  it("con una valoración reciente: muestra el callout de última vez", async () => {
    const ui = await WelcomePanel({
      name: "Fran",
      username: "fran",
      lastActivity: rating,
      now: new Date(2026, 0, 1, 15),
    });
    renderWithIntl(ui);

    expect(screen.getByText("greetingAfternoon")).toBeInTheDocument();
    expect(screen.getByText("lastTouchRating")).toBeInTheDocument();
    expect(screen.getByTestId("cover-thumb")).toBeInTheDocument();
  });

  it("con un comentario reciente: usa la clave de comentario", async () => {
    const ui = await WelcomePanel({
      name: "Fran",
      username: "fran",
      lastActivity: comment,
      now: new Date(2026, 0, 1, 21),
    });
    renderWithIntl(ui);

    expect(screen.getByText("greetingEvening")).toBeInTheDocument();
    expect(screen.getByText("lastTouchComment")).toBeInTheDocument();
  });

  it("siempre incluye los accesos rápidos", async () => {
    const ui = await WelcomePanel({ name: "Fran", username: "fran", lastActivity: null, now: new Date() });
    renderWithIntl(ui);

    expect(screen.getByTestId("quick-links")).toBeInTheDocument();
  });

  it("el nombre linkea al perfil propio", async () => {
    const ui = await WelcomePanel({ name: "Fran", username: "fran", lastActivity: null, now: new Date() });
    renderWithIntl(ui);

    expect(screen.getByRole("link", { name: "Fran" })).toHaveAttribute("href", "/users/fran");
  });
});
