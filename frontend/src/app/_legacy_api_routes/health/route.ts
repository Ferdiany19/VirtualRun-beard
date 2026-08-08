import { NextResponse } from "next/server";
import { getPool } from "@/db/pool";
import { env } from "@/shared/config/env";
import { getCorrelationId } from "@/shared/http/correlation-id";
import { logger } from "@/shared/logging/logger";

export const runtime = "nodejs";

type DatabaseStatus = "not_configured" | "ok" | "error";

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request.headers);
  let database: DatabaseStatus = "not_configured";

  if (env.DATABASE_URL) {
    try {
      const result = await getPool().query<{ ok: number }>("SELECT 1 AS ok");
      database = result.rows[0]?.ok === 1 ? "ok" : "error";
    } catch (error) {
      database = "error";
      logger.warn("Database health check failed", {
        correlationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(
    {
      service: "virtual-run-beard",
      status: database === "error" ? "degraded" : "ok",
      database,
      timezone: env.BUSINESS_TIMEZONE,
      checkedAt: new Date().toISOString(),
      correlationId,
    },
    {
      status: database === "error" ? 503 : 200,
      headers: {
        "x-correlation-id": correlationId,
        "cache-control": "no-store",
      },
    },
  );
}
