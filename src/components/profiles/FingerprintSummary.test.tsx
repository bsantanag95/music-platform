import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { FingerprintSummary } from "./FingerprintSummary";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("FingerprintSummary", () => {
  it("no renderiza nada sin década ni frases (spec taste-fingerprint, sin datos suficientes)", async () => {
    expect(await FingerprintSummary({ username: "ana", topDecade: null, phrases: [] })).toBeNull();
  });

  it("destaca la década predominante y lista las frases, sin gráficos", async () => {
    render(
      await FingerprintSummary({
        username: "ana",
        topDecade: "2010s",
        phrases: ["Su familia más presente es Rock", "Es un calificador exigente"],
      }),
    );
    expect(screen.getByText("2010s")).toBeInTheDocument();
    expect(screen.getByText("strip.topDecade")).toBeInTheDocument();
    expect(screen.getByText("Su familia más presente es Rock")).toBeInTheDocument();
    expect(screen.getByText("Es un calificador exigente")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("enlaza a la huella completa", async () => {
    render(await FingerprintSummary({ username: "ana", topDecade: "2010s", phrases: [] }));
    expect(screen.getByRole("link", { name: "level3.fingerprint" })).toHaveAttribute(
      "href",
      "/users/ana/fingerprint",
    );
  });
});
