import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  replaceLinks: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/identity", () => ({ replaceLinks: mocks.replaceLinks }));

const user = { id: "00000000-0000-4000-8000-000000000001" };

function put(body: unknown) {
  return new NextRequest("http://localhost/api/me/profile/links", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
});

describe("PUT /api/me/profile/links", () => {
  it("reemplaza el conjunto y devuelve los enlaces persistidos", async () => {
    const links = [{ id: "l1", kind: "website", url: "https://ana.example", position: 0 }];
    mocks.replaceLinks.mockResolvedValue(links);

    const res = await PUT(put({ links: [{ kind: "website", url: "https://ana.example" }] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ links });
    expect(mocks.replaceLinks).toHaveBeenCalledWith(user.id, [
      { kind: "website", url: "https://ana.example" },
    ]);
  });

  it("rechaza un sexto enlace con VALIDATION_ERROR", async () => {
    const links = Array.from({ length: 6 }, (_, i) => ({
      kind: "other",
      url: `https://x${i}.example`,
    }));
    const res = await PUT(put({ links }));
    expect(res.status).toBe(400);
    expect(mocks.replaceLinks).not.toHaveBeenCalled();
  });

  it("rechaza una URL no http(s)", async () => {
    const res = await PUT(put({ links: [{ kind: "website", url: "ftp://ana.example" }] }));
    expect(res.status).toBe(400);
  });

  it("DELETE vacía todos los enlaces", async () => {
    mocks.replaceLinks.mockResolvedValue([]);
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mocks.replaceLinks).toHaveBeenCalledWith(user.id, []);
    expect(await res.json()).toEqual({ links: [] });
  });
});
