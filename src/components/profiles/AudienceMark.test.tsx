import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AudienceMark } from "./AudienceMark";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("AudienceMark", () => {
  it("solo para seguidores: «Seguidores»", () => {
    render(<AudienceMark audience="followers" />);
    expect(screen.getByText("audienceMark.followers")).toBeInTheDocument();
  });

  it("privada: «Solo tú»", () => {
    render(<AudienceMark audience="private" />);
    expect(screen.getByText("audienceMark.private")).toBeInTheDocument();
  });

  it("pública: sin marca", () => {
    const { container } = render(<AudienceMark audience="public" />);
    expect(container).toBeEmptyDOMElement();
  });
});
