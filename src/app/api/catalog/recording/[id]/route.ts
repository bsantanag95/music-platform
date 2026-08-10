import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { getRecordingDetail } from "@/services/catalog/recording-detail";

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const parsedId = z.uuid().safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "El id de la grabación no es válido", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const result = await getRecordingDetail(parsedId.data);
    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "Grabación no encontrada", code: "RECORDING_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.detail);
  },
);
