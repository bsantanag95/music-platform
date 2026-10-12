import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requirePermission } from "@/services/auth/authorization";
import { listTemplatesAdmin } from "@/services/discovery/featured";

export const GET = withErrorHandling(async () => {
  await requirePermission("editorial.author");
  return NextResponse.json({ templates: await listTemplatesAdmin() });
});
