import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { PrivateProfileDoor } from "./PrivateProfileDoor";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { ProfileView } from "@/services/profiles/profile-view";

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
    refreshOnAnyChange?: boolean;
    requestedLabel?: string;
  }) => (
    <div
      data-testid="follow-button"
      data-relation={props.relation}
      data-authenticated={String(props.authenticated)}
      data-preview={props.preview ? "true" : undefined}
      data-request-approval={props.requestApproval ? "true" : undefined}
      data-refresh-any={props.refreshOnAnyChange ? "true" : undefined}
      data-requested-label={props.requestedLabel}
    />
  ),
}));

vi.mock("@/components/social/BlockButton", () => ({
  BlockButton: (props: { blocked: boolean; variant?: string; refreshOnChange?: boolean }) => (
    <div
      data-testid="block-button"
      data-blocked={String(props.blocked)}
      data-variant={props.variant}
      data-refresh={props.refreshOnChange ? "true" : undefined}
    />
  ),
}));

vi.mock("@/components/profiles/ProfileModerationActions", () => ({
  ProfileModerationActions: () => <div data-testid="moderation-actions" />,
}));

const base: ProfileView = {
  id: "u1",
  username: "ana",
  displayName: "Ana Torres",
  profileVisibility: "private",
  bio: null,
  pronouns: null,
  pronounSet: null,
  country: null,
  location: null,
  timezone: null,
  showLocalTime: false,
  selfRoles: [],
  genres: [],
  listeningFormats: [],
  prompts: [],
  avatarUrl: null,
  memberSince: new Date("2025-09-15T00:00:00Z"),
  links: [],
  followerCount: 12,
  followingCount: 8,
  relation: "none",
  accessible: false,
  blockedByMe: false,
  isOwner: false,
};

async function renderDoor(
  over: Partial<ProfileView> = {},
  props: { authenticated?: boolean; mutualFollowers?: number; preview?: boolean } = {},
) {
  renderWithIntl(
    await PrivateProfileDoor({
      profile: { ...base, ...over },
      authenticated: props.authenticated ?? true,
      mutualFollowers: props.mutualFollowers ?? 0,
      preview: props.preview,
    }),
  );
}

const ghostLabels = () =>
  Array.from(screen.getByTestId("private-ghosts").querySelectorAll("p")).map((p) => p.textContent);

describe("PrivateProfileDoor", () => {
  it("sin sesión: «Solo para seguidores», iniciar sesión + Crear cuenta, las cuatro siluetas sin datos", async () => {
    await renderDoor({}, { authenticated: false });
    expect(screen.getByRole("heading", { level: 2, name: "privateProfile.title.anonymous" })).toBeInTheDocument();
    expect(screen.getByText("privateProfile.body.anonymous(@ana)")).toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-authenticated", "false");
    expect(screen.getByRole("link", { name: "createAccount" })).toHaveAttribute("href", "/auth/register");
    expect(ghostLabels()).toEqual(["diaryTitle", "favoritesTitle", "listsTitle", "collectionTitle"]);
    expect(screen.getByTestId("private-ghosts")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("private-ghosts").querySelector("img")).toBeNull();
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("moderation-actions")).not.toBeInTheDocument();
  });

  it("con sesión, sin relación: solicitar seguir con refresco, bloquear y moderación al pie", async () => {
    await renderDoor({ relation: "none" });
    const follow = screen.getByTestId("follow-button");
    expect(follow).toHaveAttribute("data-relation", "none");
    expect(follow).toHaveAttribute("data-request-approval", "true");
    expect(follow).toHaveAttribute("data-refresh-any", "true");
    expect(screen.getByText("privateProfile.body.none(@ana)")).toBeInTheDocument();
    expect(screen.getByTestId("block-button")).toHaveAttribute("data-blocked", "false");
    expect(screen.getByTestId("moderation-actions")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "createAccount" })).not.toBeInTheDocument();
  });

  it("seguidores en común: solo si hay", async () => {
    await renderDoor({ relation: "none" }, { mutualFollowers: 3 });
    expect(screen.getByText("privateNoticeMutual")).toBeInTheDocument();
  });

  it("sin seguidores en común: no muestra la línea", async () => {
    await renderDoor({ relation: "none" }, { mutualFollowers: 0 });
    expect(screen.queryByText("privateNoticeMutual")).not.toBeInTheDocument();
  });

  it("solicitud enviada: título propio, «Pendiente» con cancelar y el perfil se abrirá aquí", async () => {
    await renderDoor({ relation: "requested" });
    expect(screen.getByRole("heading", { level: 2, name: "privateProfile.title.requested" })).toBeInTheDocument();
    expect(screen.getByText("privateProfile.body.requested(@ana)")).toBeInTheDocument();
    const follow = screen.getByTestId("follow-button");
    expect(follow).toHaveAttribute("data-relation", "requested");
    expect(follow).toHaveAttribute("data-requested-label", "privateProfile.pending");
    expect(screen.getByTestId("private-ghosts")).toBeInTheDocument();
  });

  it("solicitud recibida: «Quiere seguirte», responder desde aquí, sin siluetas", async () => {
    await renderDoor({ relation: "incoming" }, { mutualFollowers: 2 });
    expect(screen.getByRole("heading", { level: 2, name: "privateProfile.title.incoming" })).toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-relation", "incoming");
    expect(screen.queryByTestId("private-ghosts")).not.toBeInTheDocument();
    expect(screen.getByText("privateNoticeMutual")).toBeInTheDocument();
  });

  it("bloqueo propio: desbloquear como acción, sin seguir, sin siluetas ni segundo bloqueo", async () => {
    await renderDoor({ relation: "blocked", blockedByMe: true });
    expect(screen.queryByTestId("follow-button")).not.toBeInTheDocument();
    const blocks = screen.getAllByTestId("block-button");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveAttribute("data-blocked", "true");
    expect(blocks[0]).toHaveAttribute("data-variant", "secondary");
    expect(blocks[0]).toHaveAttribute("data-refresh", "true");
    expect(screen.getByRole("heading", { level: 2, name: "privateProfile.title.blockedByMe" })).toBeInTheDocument();
    expect(screen.queryByTestId("private-ghosts")).not.toBeInTheDocument();
    expect(screen.getByTestId("moderation-actions")).toBeInTheDocument();
  });

  it("bloqueado por la cuenta: solo el título y la oración, sin acciones ni siluetas", async () => {
    await renderDoor({ relation: "blocked", blockedByMe: false });
    expect(screen.getByRole("heading", { level: 2, name: "privateProfile.title.blockedByThem" })).toBeInTheDocument();
    expect(screen.queryByTestId("follow-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("moderation-actions")).not.toBeInTheDocument();
    expect(screen.queryByTestId("private-ghosts")).not.toBeInTheDocument();
  });

  it("«cómo te ven»: acción inerte, siluetas, sin bloqueo ni moderación", async () => {
    await renderDoor({ relation: "none" }, { authenticated: true, preview: true });
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-preview", "true");
    expect(screen.getByRole("heading", { level: 2, name: "privateProfile.title.preview" })).toBeInTheDocument();
    expect(screen.getByTestId("private-ghosts")).toBeInTheDocument();
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("moderation-actions")).not.toBeInTheDocument();
  });
});
