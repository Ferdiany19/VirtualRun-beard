import type { PoolClient } from "pg";
import { query } from "@/db/pool";
import type { ActorType } from "@/modules/audit/domain/audit-log";

export type AuditLogInput = {
  actorType: ActorType;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  eventId: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
};

export type RecentAuditLog = {
  id: string;
  actorType: ActorType;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  eventId: string | null;
  createdAt: Date;
};

type AuditLogRow = {
  id: string;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  event_id: string | null;
  created_at: Date;
};

type EventActivityRow = AuditLogRow & {
  event_name: string | null;
  actor_name: string | null;
};

export async function createAuditLog(input: AuditLogInput, client?: PoolClient): Promise<void> {
  await query(
    `
      INSERT INTO audit_logs (
        actor_type,
        actor_id,
        action,
        entity_type,
        entity_id,
        event_id,
        previous_values,
        new_values,
        ip_address,
        user_agent,
        correlation_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::inet, $10, $11)
    `,
    [
      input.actorType,
      input.actorId,
      input.action,
      input.entityType,
      input.entityId,
      input.eventId,
      input.previousValues ? JSON.stringify(input.previousValues) : null,
      input.newValues ? JSON.stringify(input.newValues) : null,
      input.ipAddress,
      input.userAgent,
      input.correlationId,
    ],
    client,
  );
}

export async function listRecentAuditLogs(
  limit: number,
  client?: PoolClient,
): Promise<RecentAuditLog[]> {
  const result = await query<AuditLogRow>(
    `
      SELECT
        id,
        actor_type,
        actor_id,
        action,
        entity_type,
        entity_id,
        event_id,
        created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit],
    client,
  );

  return result.rows.map((row) => ({
    id: row.id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    eventId: row.event_id,
    createdAt: row.created_at,
  }));
}

export async function listRecentEventActivities(
  eventIds: string[],
  limit: number,
  client?: PoolClient,
): Promise<
  Array<{
    id: string;
    action: string;
    eventId: string | null;
    eventName: string | null;
    actorName: string | null;
    createdAt: Date;
  }>
> {
  if (eventIds.length === 0) {
    return [];
  }

  const result = await query<EventActivityRow>(
    `
      SELECT
        al.id,
        al.actor_type,
        al.actor_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.event_id,
        al.created_at,
        e.name AS event_name,
        au.full_name AS actor_name
      FROM audit_logs al
      LEFT JOIN events e ON e.id = al.event_id
      LEFT JOIN admin_users au ON au.id = al.actor_id
      WHERE al.event_id = ANY($1::uuid[])
      ORDER BY al.created_at DESC
      LIMIT $2
    `,
    [eventIds, limit],
    client,
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    eventId: row.event_id,
    eventName: row.event_name,
    actorName: row.actor_name,
    createdAt: row.created_at,
  }));
}
