export interface RestrictionWindow {
  startsAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export function isRestrictionActive(restriction: RestrictionWindow, now = new Date()): boolean {
  return restriction.revokedAt === null
    && restriction.startsAt <= now
    && (restriction.expiresAt === null || restriction.expiresAt > now);
}
