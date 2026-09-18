import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import usersEs from "../../../messages/es/users.json";
import { MutualFollowersRow } from "./MutualFollowersRow";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }));

const first = { id: "u2", username: "leo", displayName: "Leo Martínez", profileVisibility: "public" as const };

function renderRow(total: number) {
  return render(
    <NextIntlClientProvider locale="es" messages={{ users: usersEs }}>
      <MutualFollowersRow username="ana" total={total} first={first} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MutualFollowersRow", () => {
  it("un solo seguidor en común: mensaje singular sin número clickeable", () => {
    renderRow(1);
    expect(screen.getByText("Leo Martínez")).toBeInTheDocument();
    expect(screen.getByText("sigue a este usuario")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("varios en común: muestra el resto como número clickeable", () => {
    renderRow(4);
    expect(screen.getByText("Leo Martínez")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByText("siguen a este usuario")).toBeInTheDocument();
  });

  it("clickear el número abre el modal y carga el listado completo", async () => {
    mocks.apiFetch.mockResolvedValue({
      users: [first, { id: "u3", username: "mia", displayName: null, profileVisibility: "public" }],
      totalCount: 4,
      page: 1,
      pageSize: 50,
      hasNext: false,
    });
    renderRow(4);

    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/users/ana/mutual-followers?pageSize=50",
      expect.anything(),
    );
    expect(screen.getByText("mia")).toBeInTheDocument();
  });

  it("el modal cierra con el botón Cerrar", async () => {
    mocks.apiFetch.mockResolvedValue({ users: [], totalCount: 1, page: 1, pageSize: 50, hasNext: false });
    renderRow(2);
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
