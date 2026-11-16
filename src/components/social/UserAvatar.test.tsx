import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { UserAvatar } from "./UserAvatar";

vi.mock("next/image", () => ({
  default: (props: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    onError?: () => void;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.src}
      alt={props.alt}
      width={props.width}
      height={props.height}
      className={props.className}
      onError={props.onError}
      data-testid="avatar-img"
    />
  ),
}));

describe("UserAvatar", () => {
  it("renderiza una imagen cuando hay avatarUrl", () => {
    renderWithIntl(
      <UserAvatar
        avatarUrl="https://cdn.example.com/avatar/uuid.webp"
        username="ana"
        name="Ana"
        size="md"
      />,
    );
    const img = screen.getByTestId("avatar-img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://cdn.example.com/avatar/uuid.webp");
  });

  it("renderiza un monograma cuando avatarUrl es null", () => {
    renderWithIntl(
      <UserAvatar
        avatarUrl={null}
        username="ana"
        name="Ana"
        size="md"
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByTestId("avatar-img")).not.toBeInTheDocument();
  });

  it("cae al monograma si la imagen no carga (spec profile-identity)", () => {
    renderWithIntl(
      <UserAvatar avatarUrl="https://cdn.example.com/avatar/borrado.webp" username="ana" name="Ana" size="xl" />,
    );
    fireEvent.error(screen.getByTestId("avatar-img"));
    expect(screen.queryByTestId("avatar-img")).not.toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
