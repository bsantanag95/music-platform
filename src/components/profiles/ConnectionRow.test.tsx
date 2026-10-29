import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ConnectionRow, connectionBadge } from "./ConnectionRow";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("connectionBadge", () => {
  it("Mutuo, Lo sigues, Te sigue y Tú según la relación", () => {
    expect(connectionBadge("following", true, "other")).toBe("mutual");
    expect(connectionBadge("following", false, "other")).toBe("youFollow");
    expect(connectionBadge("none", true, "other")).toBe("followsYou");
    expect(connectionBadge("requested", true, "other")).toBe("followsYou");
    expect(connectionBadge("self", false, "other")).toBe("you");
    expect(connectionBadge("none", false, "other")).toBeNull();
  });

  it("no repite lo que la vista ya dice", () => {
    expect(connectionBadge("none", true, "ownFollowers")).toBeNull();
    expect(connectionBadge("following", false, "ownFollowing")).toBeNull();
    expect(connectionBadge("following", true, "ownFollowers")).toBe("mutual");
  });

  it("sin sesión ni bloqueo, ninguna", () => {
    expect(connectionBadge(null, true, "other")).toBeNull();
    expect(connectionBadge("blocked", true, "other")).toBeNull();
  });
});

describe("ConnectionRow", () => {
  const noop = () => undefined;
  const handlers = {
    onRelationChange: noop,
    onUnfollow: noop,
    onCancelRequest: noop,
    onRemove: noop,
  };

  it("te sigue y no la sigues: Seguir de vuelta, sin insignia en tus Seguidores", () => {
    renderWithIntl(
      <ul>
        <ConnectionRow
          user={{ id: "u1", username: "leo", displayName: "Leo", profileVisibility: "public", avatarUrl: null, relation: "none", followsYou: true }}
          authenticated
          removable
          context="ownFollowers"
          busy={false}
          {...handlers}
        />
      </ul>,
    );
    expect(screen.getByRole("button", { name: "Seguir de vuelta" })).toBeInTheDocument();
    expect(screen.queryByText("Te sigue")).toBeNull();
  });

  it("sin sesión: ni acciones ni insignias", () => {
    renderWithIntl(
      <ul>
        <ConnectionRow
          user={{ id: "u1", username: "leo", displayName: "Leo", profileVisibility: "public", avatarUrl: null, followsYou: true }}
          authenticated={false}
          removable={false}
          busy={false}
          {...handlers}
        />
      </ul>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Te sigue")).toBeNull();
  });
  it("línea de detalle: @usuario, desde cuándo según la vista y discos en común", () => {
    const user = {
      id: "u1",
      username: "leo",
      displayName: "Leo",
      profileVisibility: "public" as const,
      avatarUrl: null,
      relation: "following" as const,
      followsYou: true,
      followedAt: "2026-10-15T12:00:00.000Z",
      sharedAlbums: 8,
    };
    const first = renderWithIntl(
      <ul>
        <ConnectionRow user={user} authenticated removable context="ownFollowers" busy={false} {...handlers} />
      </ul>,
    );
    expect(screen.getByText(/Te sigue desde oct 2026/)).toBeInTheDocument();
    expect(screen.getByText(/8 discos en común/)).toBeInTheDocument();
    expect(screen.getByText(/@leo/)).toBeInTheDocument();

    first.unmount();
    renderWithIntl(
      <ul>
        <ConnectionRow user={user} authenticated removable={false} context="other" busy={false} {...handlers} />
      </ul>,
    );
    expect(screen.getByText(/Desde oct 2026/)).toBeInTheDocument();
  });

  it("sin sesión no hay discos en común", () => {
    renderWithIntl(
      <ul>
        <ConnectionRow
          user={{ id: "u1", username: "leo", displayName: "Leo", profileVisibility: "public", avatarUrl: null, sharedAlbums: 8 }}
          authenticated={false}
          removable={false}
          busy={false}
          {...handlers}
        />
      </ul>,
    );
    expect(screen.queryByText(/discos en común/)).toBeNull();
  });
});
