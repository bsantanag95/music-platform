import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requirePermission } from "@/services/auth/authorization";
import { runTemplateNow } from "@/services/discovery/featured";

// 202: la regeneración corre en segundo plano (respeta el lock de corridas de la plantilla).
export const POST = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) => {
  const { key } = await params;
  const actor = await requirePermission("editorial.publish");
  await runTemplateNow(actor.id, key);
  return NextResponse.json({ ok: true }, { status: 202 });
});
