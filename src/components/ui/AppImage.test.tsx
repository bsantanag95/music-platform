import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    unoptimized,
  }: {
    src: string;
    alt?: string;
    unoptimized?: boolean;
  }) => (
    <img
      data-testid="img"
      src={typeof src === "string" ? src : ""}
      alt={alt ?? ""}
      data-unoptimized={String(Boolean(unoptimized))}
    />
  ),
}));

import { AppImage } from "./AppImage";

describe("AppImage", () => {
  const original = process.env.STORAGE_PUBLIC_DOMAIN;

  afterEach(() => {
    if (original === undefined) delete process.env.STORAGE_PUBLIC_DOMAIN;
    else process.env.STORAGE_PUBLIC_DOMAIN = original;
  });

  it("saltea el optimizador para el storage propio", () => {
    process.env.STORAGE_PUBLIC_DOMAIN = "https://cdn.example.com";
    render(<AppImage src="https://cdn.example.com/covers/x.webp" alt="" width={100} height={100} />);
    expect(screen.getByTestId("img")).toHaveAttribute("data-unoptimized", "true");
  });

  it("saltea el optimizador para /uploads/", () => {
    render(<AppImage src="/uploads/avatar/x.webp" alt="" width={100} height={100} />);
    expect(screen.getByTestId("img")).toHaveAttribute("data-unoptimized", "true");
  });

  it("deja pasar por el optimizador una fuente de Cover Art Archive", () => {
    render(
      <AppImage
        src="https://coverartarchive.org/release-group/x/front-250"
        alt=""
        width={100}
        height={100}
      />,
    );
    expect(screen.getByTestId("img")).toHaveAttribute("data-unoptimized", "false");
  });

  it("ignora el unoptimized que envíe el llamador", () => {
    process.env.STORAGE_PUBLIC_DOMAIN = "https://cdn.example.com";
    render(
      <AppImage
        src="https://coverartarchive.org/release-group/x/front-250"
        alt=""
        width={100}
        height={100}
        unoptimized
      />,
    );
    expect(screen.getByTestId("img")).toHaveAttribute("data-unoptimized", "false");
  });
});
