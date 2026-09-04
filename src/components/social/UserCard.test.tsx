import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { FollowRelation, ProfileVisibility, UserSummary } from "@/lib/api/schemas";
import { UserCard } from "./UserCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

type CardUser = UserSummary & { relation?: FollowRelation };

function user(overrides: Partial<CardUser> & { username: string; id: string }): CardUser {
  return {
    displayName: null,
    profileVisibility: "public" as ProfileVisibility,
    ...overrides,
  };
}

describe("UserCard", () => {
  it("muestra un monograma derivado del nombre visible", () => {
    renderWithIntl(
      <UserCard
        user={user({ id: "u1", username: "ana", displayName: "Ana", relation: "none" })}
        authenticated
      />,
    );
    // El monograma es decorativo (aria-hidden), pero su letra es visible.
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("enlaza al perfil del usuario", () => {
    renderWithIntl(
      <UserCard
        user={user({ id: "u1", username: "ana", relation: "none" })}
        authenticated
      />,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/users/ana");
  });

  it("muestra Seguir para una relación inexistente", () => {
    renderWithIntl(
      <UserCard
        user={user({ id: "u1", username: "ana", relation: "none" })}
        authenticated
      />,
    );
    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
  });

  it("muestra Perfil propio para sí mismo", () => {
    renderWithIntl(
      <UserCard user={user({ id: "u1", username: "ana", relation: "self" })} authenticated />,
    );
    expect(screen.getByText("Perfil propio")).toBeInTheDocument();
  });

  it("invita a iniciar sesión cuando no hay autenticación", () => {
    renderWithIntl(
      <UserCard user={user({ id: "u1", username: "ana", relation: "none" })} authenticated={false} />,
    );
    expect(screen.getByRole("link", { name: "Iniciar sesión para seguir" })).toBeInTheDocument();
  });

  it("muestra Siguiendo cuando no llega relación pero hay sesión", () => {
    renderWithIntl(
      <UserCard user={user({ id: "u1", username: "ana" })} authenticated />,
    );
    expect(screen.getByText("Siguiendo")).toBeInTheDocument();
  });
});
