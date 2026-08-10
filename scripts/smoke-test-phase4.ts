export {};

import { randomUUID, createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import {
  appUser,
  artist,
  authIdentity,
  comment,
  membership,
  rating,
  recording,
  releaseGroup,
  session,
} from "../src/db/schema";
import { getArtistMemberships } from "../src/services/catalog/ingest-artist";
import { getRecordingDetail } from "../src/services/catalog/recording-detail";

assertSmokeAllowed();

const userId = randomUUID();
const personId = randomUUID();
const groupId = randomUUID();
const releaseGroupId = randomUUID();
const recordingId = randomUUID();
const identityId = randomUUID();
const sessionOneId = randomUUID();
const sessionTwoId = randomUUID();
const now = new Date();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  try {
    await db.insert(appUser).values({
      id: userId,
      username: `smoke-phase4-${userId.slice(0, 8)}`,
      email: `smoke-phase4-${userId.slice(0, 8)}@example.test`,
    });
    await db.insert(artist).values([
      { id: personId, type: "person", name: "Smoke Phase 4 Person" },
      { id: groupId, type: "group", name: "Smoke Phase 4 Group" },
    ]);
    await db.insert(membership).values({ personId, groupId, role: "voz", joinedOn: "2000-01-01" });
    await db.insert(releaseGroup).values({
      id: releaseGroupId,
      title: "Smoke Phase 4 Album",
      category: "studio",
    });
    await db.insert(recording).values({ id: recordingId, title: "Smoke Phase 4 Track" });
    await db.insert(authIdentity).values({
      id: identityId,
      userId,
      provider: "smoke",
      providerAccountId: `account-${userId}`,
    });

    await db.insert(session).values([
      {
        id: sessionOneId,
        userId,
        tokenHash: hashToken(`session-one-${userId}`),
        expiresAt: new Date(now.getTime() + 60_000),
      },
      {
        id: sessionTwoId,
        userId,
        tokenHash: hashToken(`session-two-${userId}`),
        expiresAt: new Date(now.getTime() + 120_000),
      },
    ]);
    const sessions = await db.select().from(session).where(eq(session.userId, userId));
    if (sessions.length !== 2) throw new Error("La prueba de sesiones múltiples falló");

    await db.delete(session).where(eq(session.id, sessionOneId));
    const remainingSession = await db.select().from(session).where(eq(session.userId, userId));
    if (remainingSession.length !== 1) throw new Error("La revocación individual falló");

    await db.delete(session).where(eq(session.userId, userId));
    const revokedSessions = await db.select().from(session).where(eq(session.userId, userId));
    if (revokedSessions.length !== 0) throw new Error("La revocación global falló");

    const memberships = await getArtistMemberships({
      id: personId,
      type: "person",
    } as typeof artist.$inferSelect);
    if (memberships.length !== 1 || memberships[0]?.artistId !== groupId) {
      throw new Error("La navegación por membresías falló");
    }

    const recordingDetail = await getRecordingDetail(recordingId);
    if (recordingDetail.kind !== "ok") throw new Error("El detalle de grabación falló");

    await db.insert(rating).values({
      userId,
      releaseGroupId,
      stars: "4.5",
      detailedScore: 88,
    });
    await db.insert(comment).values({ userId, releaseGroupId, body: "Comentario smoke de Fase 4" });
    const savedRating = await db.select().from(rating).where(and(eq(rating.userId, userId), eq(rating.releaseGroupId, releaseGroupId)));
    const savedComment = await db.select().from(comment).where(and(eq(comment.userId, userId), eq(comment.releaseGroupId, releaseGroupId)));
    if (savedRating.length !== 1 || savedComment.length !== 1) throw new Error("La persistencia social falló");

    console.log("Smoke Fase 4 OK: sesiones, identidad, membresía, grabación, rating y comentario.");
  } finally {
    await db.delete(comment).where(eq(comment.userId, userId));
    await db.delete(rating).where(eq(rating.userId, userId));
    await db.delete(session).where(eq(session.userId, userId));
    await db.delete(authIdentity).where(eq(authIdentity.id, identityId));
    await db.delete(membership).where(and(eq(membership.personId, personId), eq(membership.groupId, groupId)));
    await db.delete(recording).where(eq(recording.id, recordingId));
    await db.delete(releaseGroup).where(eq(releaseGroup.id, releaseGroupId));
    await db.delete(artist).where(eq(artist.id, personId));
    await db.delete(artist).where(eq(artist.id, groupId));
    await db.delete(appUser).where(eq(appUser.id, userId));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Smoke Fase 4 falló:", error);
    process.exit(1);
  });
