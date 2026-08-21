import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { blockUser, unblockUser } from "@/services/social/blocking";

export const PUT = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ username: string }> }) => {
  const { username } = await context.params;
  const user = await requireUser();
  await blockUser(user.id, username);
  return NextResponse.json({ blocked: true });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ username: string }> }) => {
  const { username } = await context.params;
  const user = await requireUser();
  await unblockUser(user.id, username);
  return NextResponse.json({ blocked: false });
});