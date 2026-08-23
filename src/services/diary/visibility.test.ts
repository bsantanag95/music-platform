import { describe, expect, it } from "vitest";
import { audiencesForProfile } from "./visibility";
import type { FollowRelation, ProfileVisibility } from "@/services/social/types";
import type { DiaryAudience } from "./types";

function profile(params: {
  profileVisibility?: ProfileVisibility;
  relation?: FollowRelation;
  blockedByMe?: boolean;
}) {
  return {
    profileVisibility: "public" as ProfileVisibility,
    relation: "none" as FollowRelation,
    blockedByMe: false,
    ...params,
  };
}

describe("audiencesForProfile (matriz de visibilidad del diario ajeno)", () => {
  it("dueño ve todas sus entradas (incluida private)", () => {
    expect(audiencesForProfile(profile({ relation: "self" }))).toEqual<DiaryAudience[]>([
      "private",
      "followers",
      "public",
    ]);
  });

  it("bloqueo en cualquier dirección → nada", () => {
    expect(
      audiencesForProfile(profile({ relation: "blocked" })),
    ).toEqual([]);

    expect(
      audiencesForProfile(profile({ blockedByMe: true, relation: "none" })),
    ).toEqual([]);
  });

  it("perfil público, visitante sin relación → solo public", () => {
    expect(audiencesForProfile(profile({ relation: "none" }))).toEqual(["public"]);
  });

  it("perfil público, visitante anónimo (sin sesión) → solo public", () => {
    expect(
      audiencesForProfile(profile({ relation: "none" })),
    ).toEqual(["public"]);
  });

  it("seguidor aprobado de perfil público → public + followers", () => {
    expect(audiencesForProfile(profile({ relation: "following" }))).toEqual([
      "followers",
      "public",
    ]);
  });

  it("seguidor aprobado de perfil privado → public + followers", () => {
    expect(
      audiencesForProfile(
        profile({ profileVisibility: "private", relation: "following" }),
      ),
    ).toEqual(["followers", "public"]);
  });

  it("solicitud enviada (requested) de perfil privado → nada", () => {
    expect(
      audiencesForProfile(
        profile({ profileVisibility: "private", relation: "requested" }),
      ),
    ).toEqual([]);
  });

  it("solicitud recibida (incoming) de perfil privado → nada (solo seguidores aprobados ven entradas)", () => {
    expect(
      audiencesForProfile(
        profile({ profileVisibility: "private", relation: "incoming" }),
      ),
    ).toEqual([]);
  });

  it("solicitud recibida (incoming) de perfil público → solo public (el visitante no es seguidor aprobado)", () => {
    expect(
      audiencesForProfile(
        profile({ profileVisibility: "public", relation: "incoming" }),
      ),
    ).toEqual(["public"]);
  });

  it("requested de perfil público → solo public (no es seguidor aprobado)", () => {
    expect(audiencesForProfile(profile({ relation: "requested" }))).toEqual(["public"]);
  });

  it("perfil privado sin relación → nada (ni siquiera public)", () => {
    expect(
      audiencesForProfile(
        profile({ profileVisibility: "private", relation: "none" }),
      ),
    ).toEqual([]);
  });
});
