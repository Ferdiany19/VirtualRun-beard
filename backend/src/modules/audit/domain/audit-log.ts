export type ActorType =
  'SYSTEM' | 'ADMIN_USER' | 'PARTICIPANT_PUBLIC' | 'WORKER';

export type AuditLog = {
  id: string;
  actorType: ActorType;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  eventId: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  createdAt: Date;
};
