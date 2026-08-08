import { NextResponse } from "next/server";
import { isApplicationError } from "@/shared/errors/application-error";
import { logger } from "@/shared/logging/logger";

export function toErrorResponse(error: unknown, correlationId: string) {
  if (isApplicationError(error)) {
    logger.warn("Operational request error", {
      correlationId,
      code: error.code,
      message: error.message,
    });

    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.safeMessage,
          correlationId,
        },
      },
      {
        status: error.statusCode,
        headers: {
          "x-correlation-id": correlationId,
        },
      },
    );
  }

  logger.error("Unhandled request error", {
    correlationId,
    message: error instanceof Error ? error.message : "Unknown error",
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Terjadi kesalahan. Silakan coba lagi.",
        correlationId,
      },
    },
    {
      status: 500,
      headers: {
        "x-correlation-id": correlationId,
      },
    },
  );
}
