import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const ID = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";
const ROOT = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({ permalink: vi.fn(), session: vi.fn(), metadata: vi.fn() }));

vi.mock("@/services/social", () => ({ getCommentPermalink: mocks.permalink }));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.session }));
vi.mock("@/services/share/metadata", () => ({ buildShareMetadata: mocks.metadata }));
vi.mock("@/components/share/ShareAction", () => ({ ShareAction: ({ refId }: { refId: string }) => <div data-testid="share">{refId}</div> }));
vi.mock("@/i18n/client-messages", () => ({ withClientMessages: (_scope: string, route: unknown) => route }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("es"),
  getTranslations: vi.fn(async () => (key: string) => key),
  getFormatter: vi.fn(async () => ({ dateTime: () => "1 de noviembre de 2026" })),
}));

import CommentPage, { generateMetadata } from "./page";

const params = (commentId: string) => ({ params: Promise.resolve({ commentId }) });
const permalink = {
  comment: { id: ID, body: "Qué disco", createdAt: "2026-11-01T00:00:00.000Z" },
  author: { id: "u1", username: "ana", displayName: "Ana" },
  object: { type: "release-group", id: "rg1", title: "Master of Puppets", href: "/album/metallica-master-of-puppets-abc" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(null);
  mocks.permalink.mockResolvedValue(permalink);
  mocks.metadata.mockResolvedValue({ description: "x" });
});

describe("/comment/[commentId]", () => {
  it("muestra el comentario, su autor y el enlace a la conversación, sin sesión", async () => {
    render(await CommentPage(params(ID)));
    expect(mocks.permalink).toHaveBeenCalledWith(ID, null);
    expect(screen.getByText("Qué disco")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ana" }).getAttribute("href")).toBe("/users/ana");
    expect(screen.getByRole("link", { name: "viewConversation" }).getAttribute("href")).toBe(
      `/album/metallica-master-of-puppets-abc?thread=${ID}`,
    );
    expect(screen.getByTestId("share").textContent).toBe(ID);
  });

  it("lee como quien mira, para aplicar sus bloqueos", async () => {
    mocks.session.mockResolvedValue({ user: { id: "lector" } });
    await CommentPage(params(ID));
    expect(mocks.permalink).toHaveBeenCalledWith(ID, "lector");
  });

  it("una respuesta redirige a su raíz", async () => {
    mocks.permalink.mockResolvedValue({ ...permalink, comment: { ...permalink.comment, id: ROOT } });
    await expect(CommentPage(params(ID))).rejects.toThrow(`NEXT_REDIRECT:/es/comment/${ROOT}`);
  });

  it("responde 404 si no se puede ver o el id no es válido", async () => {
    mocks.permalink.mockResolvedValue(null);
    await expect(CommentPage(params(ID))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(CommentPage(params("no-es-un-id"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("anuncia los metadatos del comentario", async () => {
    expect(await generateMetadata(params(ID))).toEqual({ description: "x" });
    expect(mocks.metadata).toHaveBeenCalledWith("comment", ID, "es", { withTitle: true });
  });
});
