import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
  searchUsers: vi.fn(),
  getProfileByUsername: vi.fn(),
  getOwnProfile: vi.fn(),
  updateProfileVisibility: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  listFollowers: vi.fn(),
  listFollowing: vi.fn(),
  listFollowRequests: vi.fn(),
  removeFollower: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  listBlocks: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({
  requireUser: mocks.requireUser,
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/services/social/profiles", () => ({
  searchUsers: mocks.searchUsers,
  getProfileByUsername: mocks.getProfileByUsername,
  getOwnProfile: mocks.getOwnProfile,
  updateProfileVisibility: mocks.updateProfileVisibility,
}));
vi.mock("@/services/social/following", () => ({
  followUser: mocks.followUser,
  unfollowUser: mocks.unfollowUser,
  approveRequest: mocks.approveRequest,
  rejectRequest: mocks.rejectRequest,
  listFollowers: mocks.listFollowers,
  listFollowing: mocks.listFollowing,
  listFollowRequests: mocks.listFollowRequests,
  removeFollower: mocks.removeFollower,
}));
vi.mock("@/services/social/blocking", () => ({
  blockUser: mocks.blockUser,
  unblockUser: mocks.unblockUser,
  listBlocks: mocks.listBlocks,
}));

import { GET as searchGet } from "@/app/api/users/route";
import { GET as profileGet } from "@/app/api/users/[username]/route";
import { GET as ownGet, PATCH as ownPatch } from "@/app/api/me/profile/route";
import { PUT as followPut, DELETE as followDelete } from "@/app/api/users/[username]/follow/route";
import { POST as approvePost } from "@/app/api/me/follow-requests/[userId]/approve/route";
import { POST as rejectPost } from "@/app/api/me/follow-requests/[userId]/reject/route";
import { GET as requestsGet } from "@/app/api/me/follow-requests/route";
import { GET as followersGet } from "@/app/api/me/followers/route";
import { GET as followingGet } from "@/app/api/me/following/route";
import { DELETE as followerDelete } from "@/app/api/me/followers/[userId]/route";
import { PUT as blockPut, DELETE as blockDelete } from "@/app/api/users/[username]/block/route";
import { GET as blocksGet } from "@/app/api/me/blocks/route";

const user = { id: "u1", username: "ana", email: "ana@example.com", displayName: null, passwordHash: null, profileVisibility: "public", createdAt: new Date() };

function url(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.getCurrentUser.mockResolvedValue(user);
});

describe("búsqueda y perfil", () => {
  it("busca usuarios con el viewer de la sesión", async () => {
    mocks.searchUsers.mockResolvedValue({ users: [], page: 1, pageSize: 20, hasNext: false });
    const response = await searchGet(url("/api/users?q=ana"));
    expect(response.status).toBe(200);
    expect(mocks.searchUsers).toHaveBeenCalledWith("ana", "u1", 1, 20);
  });

  it("exige un término de búsqueda", async () => {
    mocks.searchUsers.mockRejectedValue(new ApiError("VALIDATION_ERROR", 400, "El término es obligatorio"));
    const response = await searchGet(url("/api/users"));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("devuelve el perfil por username con viewer anónimo", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getProfileByUsername.mockResolvedValue({
      id: "u2",
      username: "pato",
      displayName: null,
      profileVisibility: "private",
      relation: "none",
      blockedByMe: false,
      accessible: false,
    });
    const response = await profileGet(url("/api/users/pato"), { params: Promise.resolve({ username: "pato" }) });
    expect(response.status).toBe(200);
    expect(mocks.getProfileByUsername).toHaveBeenCalledWith("pato", null);
  });

  it("propaga USER_NOT_FOUND del perfil", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new ApiError("USER_NOT_FOUND", 404, "no"));
    const response = await profileGet(url("/api/users/ghost"), { params: Promise.resolve({ username: "ghost" }) });
    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("USER_NOT_FOUND");
  });
});

describe("perfil propio", () => {
  it("requiere sesión para leer el perfil propio", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "no"));
    const response = await ownGet();
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("AUTH_REQUIRED");
  });

  it("lee el perfil propio autenticado", async () => {
    mocks.getOwnProfile.mockResolvedValue({ id: "u1", username: "ana", displayName: null, email: "ana@example.com", profileVisibility: "public" });
    const response = await ownGet();
    expect(response.status).toBe(200);
    expect((await response.json()).user.email).toBe("ana@example.com");
  });

  it("actualiza la visibilidad propia", async () => {
    mocks.updateProfileVisibility.mockResolvedValue({ id: "u1", username: "ana", displayName: null, email: "ana@example.com", profileVisibility: "private" });
    const response = await ownPatch(new NextRequest("http://localhost/api/me/profile", { method: "PATCH", body: JSON.stringify({ profileVisibility: "private" }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).user.profileVisibility).toBe("private");
  });

  it("rechaza una visibilidad inválida", async () => {
    const response = await ownPatch(new NextRequest("http://localhost/api/me/profile", { method: "PATCH", body: JSON.stringify({ profileVisibility: "secret" }) }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
  });
});

describe("seguimiento", () => {
  it("sigue a un usuario autenticado", async () => {
    mocks.followUser.mockResolvedValue({ relation: "following" });
    const response = await followPut(url("/api/users/pato/follow"), { params: Promise.resolve({ username: "pato" }) });
    expect(response.status).toBe(200);
    expect(mocks.followUser).toHaveBeenCalledWith("u1", "pato");
  });

  it("requiere sesión para seguir", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "no"));
    const response = await followPut(url("/api/users/pato/follow"), { params: Promise.resolve({ username: "pato" }) });
    expect(response.status).toBe(401);
  });

  it("deja de seguir", async () => {
    mocks.unfollowUser.mockResolvedValue({ relation: "none" });
    const response = await followDelete(url("/api/users/pato/follow"), { params: Promise.resolve({ username: "pato" }) });
    expect(response.status).toBe(200);
    expect((await response.json()).relation).toBe("none");
  });

  it("aprueba y rechaza solicitudes", async () => {
    mocks.approveRequest.mockResolvedValue(undefined);
    mocks.rejectRequest.mockResolvedValue(undefined);
    const requesterId = "00000000-0000-4000-8000-000000000001";

    const approve = await approvePost(url(`/api/me/follow-requests/${requesterId}/approve`), { params: Promise.resolve({ userId: requesterId }) });
    expect(approve.status).toBe(204);
    expect(mocks.approveRequest).toHaveBeenCalledWith("u1", requesterId);

    const reject = await rejectPost(url(`/api/me/follow-requests/${requesterId}/reject`), { params: Promise.resolve({ userId: requesterId }) });
    expect(reject.status).toBe(204);
    expect(mocks.rejectRequest).toHaveBeenCalledWith("u1", requesterId);
  });

  it("lista solicitudes, seguidores y seguidos", async () => {
    mocks.listFollowRequests.mockResolvedValue({ users: [], page: 1, pageSize: 20, hasNext: false });
    mocks.listFollowers.mockResolvedValue({ users: [], page: 1, pageSize: 20, hasNext: false });
    mocks.listFollowing.mockResolvedValue({ users: [], page: 1, pageSize: 20, hasNext: false });

    expect((await requestsGet(url("/api/me/follow-requests"))).status).toBe(200);
    expect((await followersGet(url("/api/me/followers"))).status).toBe(200);
    expect((await followingGet(url("/api/me/following"))).status).toBe(200);
    expect(mocks.listFollowRequests).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("elimina un seguidor propio", async () => {
    mocks.removeFollower.mockResolvedValue(undefined);
    const followerId = "00000000-0000-4000-8000-000000000002";
    const response = await followerDelete(url(`/api/me/followers/${followerId}`), { params: Promise.resolve({ userId: followerId }) });
    expect(response.status).toBe(204);
    expect(mocks.removeFollower).toHaveBeenCalledWith("u1", followerId);
  });
});

describe("bloqueo", () => {
  it("bloquea y desbloquea", async () => {
    mocks.blockUser.mockResolvedValue(undefined);
    mocks.unblockUser.mockResolvedValue(undefined);

    const block = await blockPut(url("/api/users/pato/block"), { params: Promise.resolve({ username: "pato" }) });
    expect(block.status).toBe(200);
    expect((await block.json()).blocked).toBe(true);

    const unblock = await blockDelete(url("/api/users/pato/block"), { params: Promise.resolve({ username: "pato" }) });
    expect(unblock.status).toBe(200);
    expect((await unblock.json()).blocked).toBe(false);
  });

  it("lista los bloqueos propios", async () => {
    mocks.listBlocks.mockResolvedValue({ users: [], page: 1, pageSize: 20, hasNext: false });
    const response = await blocksGet(url("/api/me/blocks"));
    expect(response.status).toBe(200);
  });
});