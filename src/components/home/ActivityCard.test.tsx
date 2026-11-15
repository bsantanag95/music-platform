import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ActivityCard, compactRatingValue } from "./ActivityCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const author = { id: "u1", username: "ana", displayName: "Ana" };
const target = {
  type: "release-group" as const,
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  title: "Loveless",
  artistName: "My Bloody Valentine",
  coverThumbUrl: null,
};

function renderCard(entry: Parameters<typeof ActivityCard>[0]["entry"], wide = false) {
  return renderWithIntl(
    <ul>
      <ActivityCard entry={entry} wide={wide} />
    </ul>,
  );
}

describe("compactRatingValue", () => {
  it("con puntaje detallado muestra 86/100 y nunca el número de estrellas", () => {
    expect(compactRatingValue("4.5", 86, "es")).toBe("86/100");
  });

  it("sin puntaje muestra las estrellas con la coma del idioma", () => {
    expect(compactRatingValue("4.5", null, "es")).toBe("4,5");
  });
});

describe("ActivityCard", () => {
  it("una valoración con puntaje muestra ★ 86/100, sin 4,5", () => {
    renderCard({
      kind: "rating",
      id: "r1",
      stars: "4.5",
      detailedScore: 86,
      createdAt: "2026-01-01T00:00:00.000Z",
      target,
      author,
    });

    expect(screen.getByText("86/100")).toBeInTheDocument();
    expect(screen.queryByText("4,5")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/users/ana");
    expect(screen.getByRole("link", { name: "Loveless" })).toBeInTheDocument();
  });

  it("un comentario muestra el extracto de su texto", () => {
    renderCard({
      kind: "comment",
      id: "c1",
      body: "Lo volví a poner de noche, con volumen alto.",
      createdAt: "2026-01-01T00:00:00.000Z",
      target,
      author,
    });

    expect(screen.getByText("Lo volví a poner de noche, con volumen alto.")).toBeInTheDocument();
  });

  it("la tarjeta ancha ocupa las dos columnas de la rejilla", () => {
    renderCard(
      { kind: "rating", id: "r2", stars: "4.0", detailedScore: null, createdAt: "2026-01-01T00:00:00.000Z", target, author },
      true,
    );

    expect(screen.getByRole("listitem").className).toContain("sm:col-span-2");
  });
});
