import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ListenEntry } from "@/lib/api/schemas";
import { DiaryPreviewTable } from "./DiaryPreviewTable";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("./diary-row-parts", () => ({ DiaryCover: () => <span data-testid="cover" /> }));
vi.mock("@/components/profiles/AudienceMark", () => ({
  AudienceMark: ({ audience }: { audience: string }) =>
    audience === "public" ? null : <span data-testid="audience-mark">{audience}</span>,
}));


const entry = (over: Partial<ListenEntry>): ListenEntry =>
  ({
    id: "e1",
    createdAt: "2026-09-24T12:00:00.000Z",
    listenContext: "relisten",
    reaction: "none",
    body: null,
    target: { type: "release-group", id: "rg1", title: "Man's Best Friend", subtitle: "Sabrina Carpenter", artistId: null },
    ...over,
  }) as unknown as ListenEntry;

describe("DiaryPreviewTable", () => {
  it("no dibuja nada sin entradas", async () => {
    expect(await DiaryPreviewTable({ entries: [] })).toBeNull();
  });

  it("una fila por entrada con fecha, obra, artista, impresión y contexto, sin caja con scroll", async () => {
    const { container } = render(
      await DiaryPreviewTable({
        entries: [entry({}), entry({ id: "e2", listenContext: "first_listen", body: "Discazo" })],
      }),
    );
    expect(screen.getAllByRole("row")).toHaveLength(3); // cabecera + 2
    expect(screen.getAllByText("Man's Best Friend")).toHaveLength(2);
    expect(screen.getByText("Discazo").tagName).toBe("Q");
    expect(screen.getAllByText("context.first_listen").length).toBeGreaterThan(0);
    expect(container.querySelector(".overflow-y-auto")).toBeNull();
    expect(screen.queryByTestId("audience-mark")).not.toBeInTheDocument();
  });

  it("vista del dueño: marca las entradas que no son públicas", async () => {
    render(
      await DiaryPreviewTable({
        entries: [
          entry({ audience: "public" } as Partial<ListenEntry>),
          entry({ id: "e2", audience: "followers" } as Partial<ListenEntry>),
        ],
        showAudience: true,
      }),
    );
    const marks = screen.getAllByTestId("audience-mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((mark) => mark.textContent === "followers")).toBe(true);
  });
});
