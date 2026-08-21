import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { followUser, unfollowUser } from "@/services/social/following";

export const PUT = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ username: string }> }) => {
  const { username } = await context.params;
  const user = await requireUser();
  return NextResponse.json(await followUser(user.id, username));
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ username: string }> }) => {
  const { username } = await context.params;
  const user = await requireUser();
  return NextResponse.json(await unfollowUser(user.id, username));
});