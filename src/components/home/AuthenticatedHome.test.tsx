import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import * as following from "@/services/social/following";
import * as home from "@/services/home/home";
import * as feed from "@/services/feed/feed";
import { AuthenticatedHome } from "./AuthenticatedHome";
import { FeedPreview } from "./FeedPreview";
import { OnboardingPrompt } from "./OnboardingPrompt";
import { RecentSelfActivity } from "./RecentSelfActivity";
import { ResumeList } from "./ResumeList";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/services/social/following", () => ({ listFollowing: vi.fn() }));
vi.mock("@/services/feed/feed", () => ({
  listFeed: vi.fn().mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
}));
vi.mock("@/services/home/home", () => ({
  listMyRecentActivity: vi
    .fn()
    .mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false }),
  getMostRecentEditedList: vi.fn().mockResolvedValue(null),
  listCommunityActivity: vi.fn().mockResolvedValue([]),
  listPublicLists: vi.fn().mockResolvedValue([]),
  listPopularComments: vi
    .fn()
    .mockResolvedValue({ artist: [], "release-group": [], recording: [] }),
  listHomeReleases: vi.fn().mockResolvedValue([]),
}));

const user = { id: "u1", username: "yo", displayName: null };

// Los hijos son Server Components async: no se ejecutan al invocar
// AuthenticatedHome, solo quedan como descriptores. Se inspecciona el árbol.
function findElement(node: unknown, type: unknown): { props?: Record<string, unknown> } | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return element as { props?: Record<string, unknown> };
  return findElement(element.props?.children, type);
}

describe("AuthenticatedHome", () => {
  beforeEach(() => vi.clearAllMocks());

  it("con al menos un seguido: muestra el preview de feed, no el onboarding", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [{ id: "u2", username: "seguido", displayName: null, profileVisibility: "public" }],
      page: 1,
      pageSize: 1,
      hasNext: false,
    });

    const element = await AuthenticatedHome({ user });

    expect(feed.listFeed).toHaveBeenCalledWith("u1", 1, 10);
    expect(findElement(element, FeedPreview)).not.toBeNull();
    expect(findElement(element, OnboardingPrompt)).toBeNull();
  });

  it("sin seguidos: muestra el onboarding y no pide el preview de feed", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [],
      page: 1,
      pageSize: 1,
      hasNext: false,
    });

    const element = await AuthenticatedHome({ user });

    expect(feed.listFeed).not.toHaveBeenCalled();
    expect(findElement(element, OnboardingPrompt)).not.toBeNull();
    expect(findElement(element, FeedPreview)).toBeNull();
  });

  it("pasa la actividad propia y la lista reciente a sus bloques", async () => {
    vi.mocked(following.listFollowing).mockResolvedValue({
      users: [],
      page: 1,
      pageSize: 1,
      hasNext: false,
    });
    const activity = [{ kind: "listen", id: "l1" }];
    const resumeList = {
      id: "list1",
      title: "Para el auto",
      entityType: "release-group" as const,
      itemCount: 2,
      coverThumbUrls: [],
    };
    vi.mocked(home.listMyRecentActivity).mockResolvedValue({
      entries: activity,
      page: 1,
      pageSize: 10,
      hasNext: false,
    } as Awaited<ReturnType<typeof home.listMyRecentActivity>>);
    vi.mocked(home.getMostRecentEditedList).mockResolvedValue(resumeList);

    const element = await AuthenticatedHome({ user });

    expect(findElement(element, RecentSelfActivity)?.props?.initialEntries).toEqual(activity);
    expect(findElement(element, ResumeList)?.props?.list).toEqual(resumeList);
  });
});

describe("RecentSelfActivity / ResumeList: se ocultan sin datos", () => {
  it("RecentSelfActivity no renderiza nada sin entradas", async () => {
    expect(await RecentSelfActivity({ initialEntries: [], initialHasNext: false })).toBeNull();
  });

  it("ResumeList no renderiza nada sin lista", async () => {
    expect(await ResumeList({ list: null })).toBeNull();
  });
});
