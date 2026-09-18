import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectionsUserList } from "./ConnectionsUserList";

const mocks = vi.hoisted(() => ({ relationsFor: vi.fn() }));
vi.mock("@/services/social/relations", () => ({
  relationsFor: (...a: unknown[]) => mocks.relationsFor(...a),
}));
vi.mock("@/components/social/UserCard", () => ({
  UserCard: ({ user }: { user: { username: string; relation?: string } }) => (
    <li data-testid="user-card" data-relation={user.relation ?? "none"}>
      {user.username}
    </li>
  ),
}));

const users = [
  { id: "u1", username: "leo", displayName: "Leo", profileVisibility: "public" as const },
  { id: "u2", username: "mia", displayName: null, profileVisibility: "public" as const },
];

describe("ConnectionsUserList", () => {
  it("lista vacía: muestra el mensaje sin consultar relaciones", async () => {
    mocks.relationsFor.mockResolvedValue(new Map());
    render(await ConnectionsUserList({ users: [], viewerId: "viewer", authenticated: true, emptyMessage: "Sin resultados" }));
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(mocks.relationsFor).not.toHaveBeenCalled();
  });

  it("renderiza una fila por usuario con su relación resuelta respecto al visitante", async () => {
    mocks.relationsFor.mockResolvedValue(new Map([["u1", "following"], ["u2", "none"]]));
    render(await ConnectionsUserList({ users, viewerId: "viewer", authenticated: true, emptyMessage: "Sin resultados" }));

    const cards = screen.getAllByTestId("user-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("data-relation", "following");
    expect(mocks.relationsFor).toHaveBeenCalledWith("viewer", ["u1", "u2"]);
  });
});
