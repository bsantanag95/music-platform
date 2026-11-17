import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { FollowersOnlyNote } from "./FollowersOnlyNote";
import { renderWithIntl } from "@/test/i18n-test-utils";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars?.username ? `${key}(@${vars.username})` : key,
  ),
}));

vi.mock("@/components/social/FollowButton", () => ({
  FollowButton: (props: {
    relation: string;
    authenticated: boolean;
    preview?: boolean;
    requestApproval?: boolean;
    refreshProfileOnFollow?: boolean;
  }) => (
    <div
      data-testid="follow-button"
      data-relation={props.relation}
      data-authenticated={String(props.authenticated)}
      data-preview={props.preview ? "true" : undefined}
      data-request-approval={props.requestApproval ? "true" : undefined}
      data-refresh={props.refreshProfileOnFollow ? "true" : undefined}
    />
  ),
}));

const profile = { id: "u1", username: "ana", relation: "none" as const };

describe("FollowersOnlyNote", () => {
  it("aviso: oración genérica y seguir directo, con refresco del perfil", async () => {
    renderWithIntl(await FollowersOnlyNote({ profile, authenticated: true, variant: "note" }));
    expect(screen.getByText("followersNote.note(@ana)")).toBeInTheDocument();
    const follow = screen.getByTestId("follow-button");
    expect(follow).not.toHaveAttribute("data-request-approval");
    expect(follow).toHaveAttribute("data-refresh", "true");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("aviso sin sesión: iniciar sesión para seguir, sin «Crear cuenta»", async () => {
    renderWithIntl(await FollowersOnlyNote({ profile, authenticated: false, variant: "note" }));
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-authenticated", "false");
    expect(screen.queryByRole("link", { name: "createAccount" })).not.toBeInTheDocument();
  });

  it("vacío sin sesión: «Nada público por ahora», la oración, la acción y «Crear cuenta»", async () => {
    renderWithIntl(await FollowersOnlyNote({ profile, authenticated: false, variant: "empty" }));
    expect(screen.getByRole("heading", { level: 2, name: "followersNote.emptyTitle" })).toBeInTheDocument();
    expect(screen.getByText("followersNote.empty(@ana)")).toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "createAccount" })).toHaveAttribute("href", "/auth/register");
  });

  it("vacío con sesión: sin «Crear cuenta»", async () => {
    renderWithIntl(await FollowersOnlyNote({ profile, authenticated: true, variant: "empty" }));
    expect(screen.queryByRole("link", { name: "createAccount" })).not.toBeInTheDocument();
  });

  it("previsualización: la acción es inerte", async () => {
    renderWithIntl(await FollowersOnlyNote({ profile, authenticated: true, preview: true, variant: "note" }));
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-preview", "true");
  });

  it("solicitud recibida: sin acción (se responde desde la cabecera)", async () => {
    renderWithIntl(
      await FollowersOnlyNote({ profile: { ...profile, relation: "incoming" }, authenticated: true, variant: "note" }),
    );
    expect(screen.getByText("followersNote.note(@ana)")).toBeInTheDocument();
    expect(screen.queryByTestId("follow-button")).not.toBeInTheDocument();
  });
});
