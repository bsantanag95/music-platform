import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
  },
  resolveImageUrl: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/storage/avatar-urls", () => ({ resolveImageUrl: mocks.resolveImageUrl }));

import { getExtendedIdentity } from "./identity";

let selectCallCount = 0;

function setupSelectChain(userRow: unknown) {
  selectCallCount = 0;
  mocks.db.select.mockImplementation(() => {
    selectCallCount++;
    const callNum = selectCallCount;

    if (callNum === 1) {
      // First call: select user from appUser
      const limit = vi.fn().mockResolvedValue(userRow ? [userRow] : []);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      return { from };
    }

    if (callNum === 2) {
      // Second call: select links from userProfileLink
      const orderBy = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ orderBy });
      const from = vi.fn().mockReturnValue({ where });
      return { from };
    }

    if (callNum === 3) {
      // Third call: count followers (inside countFollows)
      const countWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const innerJoin = vi.fn().mockReturnValue({ where: countWhere });
      const from = vi.fn().mockReturnValue({ innerJoin });
      return { from };
    }

    if (callNum === 4) {
      // Fourth call: count following (inside countFollows)
      const countWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const innerJoin = vi.fn().mockReturnValue({ where: countWhere });
      const from = vi.fn().mockReturnValue({ innerJoin });
      return { from };
    }

    if (callNum === 5) {
      // Fifth call: select prompts from userProfilePrompt
      const orderBy = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ orderBy });
      const from = vi.fn().mockReturnValue({ where });
      return { from };
    }

    return { from: vi.fn() };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveImageUrl.mockImplementation(async (id: string | null) => (id ? "https://cdn.example.com/avatar/uuid.webp" : null));
});

describe("resolución de avatarUrl en identity", () => {
  it("resuelve avatarUrl desde avatarImageId con el resolutor de imágenes", async () => {
    const userRow = {
      id: "u1",
      username: "ana",
      displayName: null,
      profileVisibility: "public",
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
      avatarImageId: "img-123",
      createdAt: new Date("2024-01-01"),
    };

    setupSelectChain(userRow);

    const result = await getExtendedIdentity("u1");

    expect(result).not.toBeNull();
    expect(result!.avatarUrl).toBe("https://cdn.example.com/avatar/uuid.webp");
    expect(mocks.resolveImageUrl).toHaveBeenCalledWith("img-123");
  });

  it("devuelve null cuando no hay avatar", async () => {
    const userRow = {
      id: "u1",
      username: "ana",
      displayName: null,
      profileVisibility: "public",
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
      avatarImageId: null,
      createdAt: new Date("2024-01-01"),
    };

    setupSelectChain(userRow);

    const result = await getExtendedIdentity("u1");

    expect(result).not.toBeNull();
    expect(result!.avatarUrl).toBeNull();
    expect(mocks.resolveImageUrl).toHaveBeenCalledWith(null);
  });
});
