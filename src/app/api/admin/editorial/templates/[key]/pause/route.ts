import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requirePermission } from "@/services/auth/authorization";
import { pauseTemplate } from "@/services/discovery/featured";

export const POST = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) => {
  const { key } = await params;
  const actor = await requirePermission("editorial.publish");
  await pauseTemplate(actor.id, key);
  return NextResponse.json({ ok: true });
});
