import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { getCurrentUser } from "@/services/auth/authorization";
import { getProfileByUsername } from "@/services/social/profiles";

export const GET = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ username: string }> }) => {
  const { username } = await context.params;
  const viewer = await getCurrentUser();
  return NextResponse.json({ user: await getProfileByUsername(username, viewer?.id ?? null) });
});