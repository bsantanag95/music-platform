import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requirePermission } from "@/services/auth/authorization";
import { listEditorialLists } from "@/services/lists/editorial";

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission("editorial.publish");
  const rawStatus = request.nextUrl.searchParams.get("status");
  const status = rawStatus === "published" || rawStatus === "withdrawn" ? rawStatus : undefined;
  return NextResponse.json({ lists: await listEditorialLists(status) });
});
