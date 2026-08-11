import type { PoolClient } from 'pg';
import { query } from '@/db/pool';
import type { Participant } from '@/modules/participants/domain/participant';

export type ParticipantInput = {
  fullName: string;
  normalizedEmail: string;
  displayEmail: string;
  normalizedPhone: string;
  displayPhone: string;
  instagramUsername: string | null;
  gender: Participant['gender'];
  dateOfBirth: string | null;
  province: string;
  cityOrRegency: string;
  district: string | null;
  postalCode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

type ParticipantRow = {
  id: string;
  full_name: string;
  normalized_email: string;
  display_email: string;
  normalized_phone: string;
  display_phone: string;
  instagram_username: string | null;
  gender: Participant['gender'];
  date_of_birth: string | null;
  province: string | null;
  city: string | null;
  city_or_regency: string | null;
  district: string | null;
  postal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: Participant['status'];
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function participantColumns(alias = 'p') {
  const prefix = alias ? `${alias}.` : '';

  return `
    ${prefix}id,
    ${prefix}full_name,
    ${prefix}normalized_email,
    ${prefix}display_email,
    ${prefix}normalized_phone,
    ${prefix}display_phone,
    ${prefix}instagram_username,
    ${prefix}gender,
    ${prefix}date_of_birth,
    ${prefix}province,
    ${prefix}city,
    ${prefix}city_or_regency,
    ${prefix}district,
    ${prefix}postal_code,
    ${prefix}emergency_contact_name,
    ${prefix}emergency_contact_phone,
    ${prefix}status,
    ${prefix}deleted_at,
    ${prefix}created_at,
    ${prefix}updated_at
  `;
}

function mapParticipant(row: ParticipantRow): Participant & {
  cityOrRegency: string | null;
  district: string | null;
  postalCode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
} {
  return {
    id: row.id,
    fullName: row.full_name,
    normalizedEmail: row.normalized_email,
    displayEmail: row.display_email,
    normalizedPhone: row.normalized_phone,
    displayPhone: row.display_phone,
    instagramUsername: row.instagram_username,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    province: row.province,
    city: row.city,
    cityOrRegency: row.city_or_regency ?? row.city,
    district: row.district,
    postalCode: row.postal_code,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    status: row.status,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ParticipantRecord = ReturnType<typeof mapParticipant>;

export async function findActiveParticipantByEmail(
  normalizedEmail: string,
  client?: PoolClient,
): Promise<ParticipantRecord | null> {
  const result = await query<ParticipantRow>(
    `
      SELECT ${participantColumns()}
      FROM participants p
      WHERE p.normalized_email = $1
        AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [normalizedEmail],
    client,
  );

  return result.rows[0] ? mapParticipant(result.rows[0]) : null;
}

export async function findActiveParticipantByPhone(
  normalizedPhone: string,
  client?: PoolClient,
): Promise<ParticipantRecord | null> {
  const result = await query<ParticipantRow>(
    `
      SELECT ${participantColumns()}
      FROM participants p
      WHERE p.normalized_phone = $1
        AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [normalizedPhone],
    client,
  );

  return result.rows[0] ? mapParticipant(result.rows[0]) : null;
}

export async function createParticipant(
  input: ParticipantInput,
  client?: PoolClient,
): Promise<ParticipantRecord> {
  const result = await query<ParticipantRow>(
    `
      INSERT INTO participants (
        full_name,
        normalized_email,
        display_email,
        normalized_phone,
        display_phone,
        instagram_username,
        gender,
        date_of_birth,
        province,
        city,
        city_or_regency,
        district,
        postal_code,
        emergency_contact_name,
        emergency_contact_phone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $10, $11, $12, $13, $14)
      RETURNING ${participantColumns('')}
    `,
    [
      input.fullName,
      input.normalizedEmail,
      input.displayEmail,
      input.normalizedPhone,
      input.displayPhone,
      input.instagramUsername,
      input.gender,
      input.dateOfBirth,
      input.province,
      input.cityOrRegency,
      input.district,
      input.postalCode,
      input.emergencyContactName,
      input.emergencyContactPhone,
    ],
    client,
  );

  return mapParticipant(result.rows[0]);
}

export async function updateParticipantInstagramUsername(
  participantId: string,
  instagramUsername: string,
  client?: PoolClient,
): Promise<ParticipantRecord> {
  const result = await query<ParticipantRow>(
    `
      UPDATE participants
      SET instagram_username = $2, updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING ${participantColumns('')}
    `,
    [participantId, instagramUsername],
    client,
  );

  return mapParticipant(result.rows[0]);
}

export async function updateParticipantByAdmin(
  participantId: string,
  input: ParticipantInput,
  client?: PoolClient,
): Promise<ParticipantRecord> {
  const result = await query<ParticipantRow>(
    `
      UPDATE participants
      SET
        full_name = $2,
        normalized_email = $3,
        display_email = $4,
        normalized_phone = $5,
        display_phone = $6,
        instagram_username = $7,
        gender = $8,
        date_of_birth = $9::date,
        province = $10,
        city = $11,
        city_or_regency = $11,
        district = $12,
        postal_code = $13,
        emergency_contact_name = $14,
        emergency_contact_phone = $15,
        updated_at = now()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING ${participantColumns('')}
    `,
    [
      participantId,
      input.fullName,
      input.normalizedEmail,
      input.displayEmail,
      input.normalizedPhone,
      input.displayPhone,
      input.instagramUsername,
      input.gender,
      input.dateOfBirth,
      input.province,
      input.cityOrRegency,
      input.district,
      input.postalCode,
      input.emergencyContactName,
      input.emergencyContactPhone,
    ],
    client,
  );

  return mapParticipant(result.rows[0]);
}
