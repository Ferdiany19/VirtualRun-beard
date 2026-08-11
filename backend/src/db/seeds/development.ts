import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { runMigrations } from '@/db/migrate';
import { query } from '@/db/pool';
import { withTransaction } from '@/db/transaction';
import {
  ensureAdminRole,
  upsertDevelopmentAdminUser,
} from '@/modules/auth/auth.repository';
import type { AdminUser } from '@/modules/auth/auth.types';
import { hashAdminPassword } from '@/modules/auth/password';
import { formatBibNumber } from '@/modules/bib/bib.service';
import { upsertSeedCategory } from '@/modules/categories/category.repository';
import type {
  EventCategoryRecord,
  GenderDivision,
} from '@/modules/categories/category.types';
import { upsertSeedEventBySlug } from '@/modules/events/event.repository';
import type {
  EventInput,
  EventRecord,
  PublicationStatus,
} from '@/modules/events/event.types';
import type { EventStatus } from '@/modules/events/domain/event-status';
import type { ParticipantRecord } from '@/modules/participants/participant.repository';
import {
  advanceBibSequence,
  getOrCreateBibSettingsForUpdate,
} from '@/modules/registrations/registration.repository';
import type {
  BibStatus,
  EmailStatus,
  EventRegistrationRecord,
} from '@/modules/registrations/registration.types';
import type {
  ActivityPlatform,
  SubmissionStatus,
} from '@/modules/submissions/submission.types';
import { putPrivateObject } from '@/modules/storage/storage.service';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logging/logger';

const legacyEventSlug = 'nusantara-virtual-run-2026';
const seedSource = 'DEV_SEED';
const jakartaOffset = '+07:00';

type SeedAdminKey = 'superAdmin' | 'eventAdmin' | 'validator' | 'reporter';

type SeedEventDefinition = {
  name: string;
  slug: string;
  shortDescription: string;
  status: EventStatus;
  publicationStatus: PublicationStatus;
  publicVisibilityEnabled: boolean;
  registrationStartsAt: Date;
  registrationEndsAt: Date;
  activityStartsAt: Date;
  activityEndsAt: Date;
  uploadStartsAt: Date;
  uploadEndsAt: Date;
  maximumParticipants: number | null;
  brandPrimaryColor: string;
  categories: SeedCategoryDefinition[];
};

type SeedCategoryDefinition = {
  name: string;
  slug: string;
  description: string;
  distanceMeters: number;
  distanceToleranceMeters: number;
  genderDivision: GenderDivision;
  participantQuota: number | null;
  rankingEnabled: boolean;
  certificateEnabled: boolean;
  priceAmountCents: number;
};

type SeedEventData = Omit<SeedEventDefinition, 'categories'> & {
  event: EventRecord;
  categories: EventCategoryRecord[];
  templateVersionId: string;
};

type SeedParticipant = ParticipantRecord & {
  index: number;
};

type SeedRegistrationCategory = {
  id: string;
  event: SeedEventData;
  category: EventCategoryRecord;
  registration: EventRegistrationRecord;
  participant: SeedParticipant;
};

type SubmissionScenario =
  | 'NONE'
  | 'SUBMITTED'
  | 'UNDER_REVIEW_ACTIVE'
  | 'UNDER_REVIEW_EXPIRED'
  | 'APPROVED'
  | 'REVISION_REQUIRED'
  | 'REJECTED'
  | 'DISQUALIFIED';

const commonTerms =
  'Peserta wajib menyelesaikan jarak sesuai kategori dalam periode aktivitas event.\n\nHasil aktivitas harus berasal dari aplikasi pencatat lari atau bukti aktivitas yang dapat diverifikasi. Organizer berhak menolak hasil yang tidak sesuai ketentuan event.';

const commonRegistrationInstructions =
  'Pilih kategori, lengkapi data peserta, setujui syarat event, lalu simpan kode registrasi dan BIB digital yang diterbitkan sistem.';

const commonUploadInstructions =
  'Upload tautan aktivitas atau screenshot hasil lari melalui halaman peserta selama periode upload masih aktif.';

const seedCategories: SeedCategoryDefinition[] = [
  {
    name: '5K Open',
    slug: '5k-open',
    description: 'Kategori pendek untuk peserta pemula dan latihan ringan.',
    distanceMeters: 5_000,
    distanceToleranceMeters: 150,
    genderDivision: 'OPEN',
    participantQuota: null,
    rankingEnabled: true,
    certificateEnabled: true,
    priceAmountCents: 75_000,
  },
  {
    name: '10K Open',
    slug: '10k-open',
    description:
      'Kategori menengah untuk pelari yang sudah menjaga ritme latihan.',
    distanceMeters: 10_000,
    distanceToleranceMeters: 250,
    genderDivision: 'OPEN',
    participantQuota: null,
    rankingEnabled: true,
    certificateEnabled: true,
    priceAmountCents: 100_000,
  },
  {
    name: '21K Male',
    slug: '21k-male',
    description: 'Kategori half marathon untuk divisi putra.',
    distanceMeters: 21_097,
    distanceToleranceMeters: 500,
    genderDivision: 'MALE',
    participantQuota: null,
    rankingEnabled: true,
    certificateEnabled: true,
    priceAmountCents: 150_000,
  },
  {
    name: '21K Female',
    slug: '21k-female',
    description: 'Kategori half marathon untuk divisi putri.',
    distanceMeters: 21_097,
    distanceToleranceMeters: 500,
    genderDivision: 'FEMALE',
    participantQuota: null,
    rankingEnabled: true,
    certificateEnabled: true,
    priceAmountCents: 150_000,
  },
];

const eventDefinitions: SeedEventDefinition[] = [
  {
    name: 'Demo Merdeka Virtual Run 2026',
    slug: 'demo-merdeka-virtual-run-2026',
    shortDescription:
      'Event pendaftaran terbuka untuk simulasi homepage, event list, dan registrasi.',
    status: 'REGISTRATION_OPEN',
    publicationStatus: 'PUBLISHED',
    publicVisibilityEnabled: true,
    registrationStartsAt: date('2026-08-01T00:00:00'),
    registrationEndsAt: date('2026-08-31T23:59:00'),
    activityStartsAt: date('2026-09-01T00:00:00'),
    activityEndsAt: date('2026-09-30T23:59:00'),
    uploadStartsAt: date('2026-09-01T00:00:00'),
    uploadEndsAt: date('2026-10-03T23:59:00'),
    maximumParticipants: null,
    brandPrimaryColor: '#0f766e',
    categories: seedCategories,
  },
  {
    name: 'Demo City Night Run 2026',
    slug: 'demo-city-night-run-2026',
    shortDescription:
      'Event sedang masa aktivitas dan upload untuk simulasi submission peserta.',
    status: 'UPLOAD_OPEN',
    publicationStatus: 'PUBLISHED',
    publicVisibilityEnabled: true,
    registrationStartsAt: date('2026-06-01T00:00:00'),
    registrationEndsAt: date('2026-07-31T23:59:00'),
    activityStartsAt: date('2026-08-01T00:00:00'),
    activityEndsAt: date('2026-08-31T23:59:00'),
    uploadStartsAt: date('2026-08-01T00:00:00'),
    uploadEndsAt: date('2026-09-03T23:59:00'),
    maximumParticipants: null,
    brandPrimaryColor: '#047857',
    categories: [
      seedCategories[0],
      seedCategories[1],
      {
        ...seedCategories[2],
        participantQuota: 18,
      },
    ],
  },
  {
    name: 'Demo Nusantara Review Run 2026',
    slug: 'demo-nusantara-review-run-2026',
    shortDescription:
      'Event masuk fase review untuk mengisi dashboard validasi.',
    status: 'REVIEW',
    publicationStatus: 'PUBLISHED',
    publicVisibilityEnabled: true,
    registrationStartsAt: date('2026-04-01T00:00:00'),
    registrationEndsAt: date('2026-05-15T23:59:00'),
    activityStartsAt: date('2026-06-01T00:00:00'),
    activityEndsAt: date('2026-06-30T23:59:00'),
    uploadStartsAt: date('2026-06-01T00:00:00'),
    uploadEndsAt: date('2026-07-05T23:59:00'),
    maximumParticipants: null,
    brandPrimaryColor: '#0d9488',
    categories: [
      seedCategories[0],
      seedCategories[1],
      seedCategories[2],
      seedCategories[3],
    ],
  },
  {
    name: 'Demo Finisher Challenge 2026',
    slug: 'demo-finisher-challenge-2026',
    shortDescription:
      'Event completed untuk melihat hasil final dan riwayat peserta.',
    status: 'COMPLETED',
    publicationStatus: 'PUBLISHED',
    publicVisibilityEnabled: true,
    registrationStartsAt: date('2026-01-01T00:00:00'),
    registrationEndsAt: date('2026-02-10T23:59:00'),
    activityStartsAt: date('2026-03-01T00:00:00'),
    activityEndsAt: date('2026-03-31T23:59:00'),
    uploadStartsAt: date('2026-03-01T00:00:00'),
    uploadEndsAt: date('2026-04-05T23:59:00'),
    maximumParticipants: null,
    brandPrimaryColor: '#115e59',
    categories: [
      seedCategories[0],
      seedCategories[1],
      {
        ...seedCategories[1],
        name: '10K Non Ranking',
        slug: '10k-non-ranking',
        rankingEnabled: false,
        certificateEnabled: true,
      },
    ],
  },
  {
    name: 'Demo Jakarta Quota Sprint 2026',
    slug: 'demo-jakarta-quota-sprint-2026',
    shortDescription:
      'Event quota kecil untuk mengecek tampilan kuota dan batas pendaftaran.',
    status: 'REGISTRATION_OPEN',
    publicationStatus: 'PUBLISHED',
    publicVisibilityEnabled: true,
    registrationStartsAt: date('2026-08-01T00:00:00'),
    registrationEndsAt: date('2026-08-20T23:59:00'),
    activityStartsAt: date('2026-08-21T00:00:00'),
    activityEndsAt: date('2026-08-31T23:59:00'),
    uploadStartsAt: date('2026-08-21T00:00:00'),
    uploadEndsAt: date('2026-09-02T23:59:00'),
    maximumParticipants: 25,
    brandPrimaryColor: '#0f766e',
    categories: [
      {
        ...seedCategories[0],
        participantQuota: 12,
      },
      {
        ...seedCategories[1],
        participantQuota: 8,
        certificateEnabled: false,
      },
    ],
  },
  {
    name: 'Demo Future Trail Run 2026',
    slug: 'demo-future-trail-run-2026',
    shortDescription:
      'Event upcoming untuk melihat state scheduled di public dan admin.',
    status: 'SCHEDULED',
    publicationStatus: 'PUBLISHED',
    publicVisibilityEnabled: true,
    registrationStartsAt: date('2026-10-01T00:00:00'),
    registrationEndsAt: date('2026-10-31T23:59:00'),
    activityStartsAt: date('2026-11-01T00:00:00'),
    activityEndsAt: date('2026-11-30T23:59:00'),
    uploadStartsAt: date('2026-11-01T00:00:00'),
    uploadEndsAt: date('2026-12-03T23:59:00'),
    maximumParticipants: null,
    brandPrimaryColor: '#0f766e',
    categories: [
      seedCategories[0],
      seedCategories[1],
      {
        name: '42K Open',
        slug: '42k-open',
        description: 'Kategori marathon virtual untuk pelari berpengalaman.',
        distanceMeters: 42_195,
        distanceToleranceMeters: 800,
        genderDivision: 'OPEN',
        participantQuota: null,
        rankingEnabled: true,
        certificateEnabled: true,
        priceAmountCents: 200_000,
      },
    ],
  },
  {
    name: 'Demo Draft Internal Run 2026',
    slug: 'demo-draft-internal-run-2026',
    shortDescription:
      'Event draft/unpublished untuk simulasi admin tanpa tampil di publik.',
    status: 'DRAFT',
    publicationStatus: 'UNPUBLISHED',
    publicVisibilityEnabled: false,
    registrationStartsAt: date('2026-12-01T00:00:00'),
    registrationEndsAt: date('2026-12-20T23:59:00'),
    activityStartsAt: date('2027-01-01T00:00:00'),
    activityEndsAt: date('2027-01-31T23:59:00'),
    uploadStartsAt: date('2027-01-01T00:00:00'),
    uploadEndsAt: date('2027-02-03T23:59:00'),
    maximumParticipants: 50,
    brandPrimaryColor: '#334155',
    categories: [seedCategories[0], seedCategories[1]],
  },
];

const participantNames = [
  'Adit Pratama',
  'Salsa Amelia',
  'Raka Mahendra',
  'Dewi Lestari',
  'Bima Saputra',
  'Nadia Putri',
  'Fajar Ramadhan',
  'Maya Kartika',
  'Andi Wijaya',
  'Siti Aminah',
  'Rizky Firmansyah',
  'Clara Santoso',
  'Yoga Nugraha',
  'Intan Permata',
  'Dimas Arya',
  'Putri Maharani',
  'Gilang Prakoso',
  'Nisa Rahma',
  'Reno Aditya',
  'Ayu Wulandari',
];

const locations = [
  ['DKI Jakarta', 'Jakarta Selatan', 'Kebayoran Baru', '12110'],
  ['Jawa Barat', 'Bandung', 'Coblong', '40132'],
  ['Jawa Timur', 'Surabaya', 'Wonokromo', '60243'],
  ['DI Yogyakarta', 'Sleman', 'Depok', '55281'],
  ['Bali', 'Denpasar', 'Denpasar Selatan', '80224'],
  ['Sumatera Utara', 'Medan', 'Medan Baru', '20153'],
  ['Sulawesi Selatan', 'Makassar', 'Rappocini', '90222'],
  ['Kalimantan Timur', 'Balikpapan', 'Balikpapan Selatan', '76114'],
] as const;

function date(value: string): Date {
  return new Date(`${value}${jakartaOffset}`);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sha256Buffer(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

async function readSeedBibTemplate(): Promise<Buffer> {
  const candidatePaths = [
    path.resolve(
      process.cwd(),
      'frontend',
      'public',
      'events',
      'dummy-bib-template.png',
    ),
    path.resolve(
      process.cwd(),
      '..',
      'frontend',
      'public',
      'events',
      'dummy-bib-template.png',
    ),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      return await readFile(candidatePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw new Error('Seed BIB template asset not found');
}

function stableUuid(seed: string): string {
  const hash = sha256(seed);
  const variant = ((Number.parseInt(hash[16] ?? '8', 16) & 0x3) | 0x8).toString(
    16,
  );

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${variant}${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

function normalizedPhone(index: number): string {
  return `+62813${String(index).padStart(8, '0')}`;
}

function displayPhone(index: number): string {
  return `0813-${String(index).padStart(4, '0')}-${String(index + 1000).padStart(4, '0')}`;
}

function categoryInput(input: SeedCategoryDefinition, displayOrder: number) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    distanceMeters: input.distanceMeters,
    distanceToleranceMeters: input.distanceToleranceMeters,
    minimumAgeYears: null,
    maximumAgeYears: null,
    genderDivision: input.genderDivision,
    participantQuota: input.participantQuota,
    rankingEnabled: input.rankingEnabled,
    certificateEnabled: input.certificateEnabled,
    priceAmountCents: input.priceAmountCents,
    displayOrder,
  };
}

function eventInput(input: SeedEventDefinition): EventInput {
  return {
    name: input.name,
    slug: input.slug,
    shortDescription: input.shortDescription,
    fullDescription: `${input.shortDescription}\n\nData ini dibuat sebagai fixture development untuk mengecek alur event, peserta, BIB, upload hasil, dan validasi tanpa memakai data produksi.`,
    termsAndConditions: commonTerms,
    registrationInstructions: commonRegistrationInstructions,
    uploadInstructions: commonUploadInstructions,
    registrationStartsAt: input.registrationStartsAt,
    registrationEndsAt: input.registrationEndsAt,
    activityStartsAt: input.activityStartsAt,
    activityEndsAt: input.activityEndsAt,
    uploadStartsAt: input.uploadStartsAt,
    uploadEndsAt: input.uploadEndsAt,
    bannerObjectKey: '/events/nusantara-virtual-run-2026/banner.png',
    thumbnailObjectKey: '/events/nusantara-virtual-run-2026/banner.png',
    maximumParticipants: input.maximumParticipants,
    contactEmail: 'organizer@beard.test',
    contactPhone: '+6281234567890',
    contactWhatsapp: '+6281234567890',
    brandPrimaryColor: input.brandPrimaryColor,
    seoTitle: `${input.name} - VirtualRun Beard`,
    seoDescription: input.shortDescription,
    seoIndexEnabled: input.publicationStatus === 'PUBLISHED',
    publicVisibilityEnabled: input.publicVisibilityEnabled,
    participantBenefits: [
      {
        key: 'e-bib',
        label: 'E-BIB Digital',
        description: 'Nomor BIB digital untuk setiap peserta.',
        enabled: true,
      },
      {
        key: 'upload-online',
        label: 'Upload Hasil Online',
        description:
          'Peserta dapat mengirim bukti aktivitas melalui dashboard peserta.',
        enabled: true,
      },
      {
        key: 'e-certificate',
        label: 'E-Sertifikat',
        description:
          'Sertifikat tersedia untuk kategori yang mengaktifkan fitur ini.',
        enabled: true,
      },
    ],
    racePackEnabled: false,
    emergencyContactEnabled: false,
    faqItems: [
      {
        question: 'Apakah event ini dilakukan di lokasi tertentu?',
        answer:
          'Tidak. Peserta dapat berlari dari lokasi masing-masing selama periode aktivitas.',
      },
      {
        question: 'Bagaimana cara mengirim hasil lari?',
        answer:
          'Peserta memakai kode registrasi untuk masuk ke halaman peserta dan mengunggah hasil.',
      },
    ],
  };
}

async function upsertDevAdmin(
  key: SeedAdminKey,
  input: { email: string; name: string },
  passwordHash: string,
  client: PoolClient,
): Promise<AdminUser> {
  const admin = await upsertDevelopmentAdminUser(
    {
      normalizedEmail: input.email.trim().toLowerCase(),
      displayEmail: input.email,
      fullName: input.name,
      passwordHash,
    },
    client,
  );

  if (key === 'superAdmin') {
    await ensureAdminRole(admin.id, 'SUPER_ADMIN', client);
  } else if (key === 'eventAdmin') {
    await ensureAdminRole(admin.id, 'EVENT_ADMIN', client);
  } else if (key === 'validator') {
    await ensureAdminRole(admin.id, 'VALIDATOR', client);
  } else {
    await ensureAdminRole(admin.id, 'REPORT_VIEWER', client);
  }

  return admin;
}

async function updateSeedEventState(
  eventId: string,
  input: SeedEventDefinition,
  adminId: string,
  client: PoolClient,
): Promise<void> {
  await query(
    `
      UPDATE events
      SET
        event_status = $2,
        publication_status = $3,
        public_visibility_enabled = $4,
        updated_by_admin_user_id = $5,
        updated_at = now()
      WHERE id = $1
    `,
    [
      eventId,
      input.status,
      input.publicationStatus,
      input.publicVisibilityEnabled,
      adminId,
    ],
    client,
  );
}

async function assignEventAdmins(
  eventId: string,
  eventAdminId: string,
  validatorId: string,
  assignedByAdminId: string,
  client: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO admin_event_assignments (
        event_id,
        admin_user_id,
        assigned_by_admin_user_id
      )
      VALUES ($1, $2, $4), ($1, $3, $4)
      ON CONFLICT (event_id, admin_user_id)
      DO UPDATE SET assigned_by_admin_user_id = EXCLUDED.assigned_by_admin_user_id
    `,
    [eventId, eventAdminId, validatorId, assignedByAdminId],
    client,
  );

  await query(
    `
      INSERT INTO event_validator_assignments (
        event_id,
        admin_user_id,
        assigned_by_admin_user_id,
        revoked_at,
        revoked_by_admin_user_id,
        revoke_reason,
        updated_at
      )
      VALUES ($1, $2, $3, NULL, NULL, NULL, now())
      ON CONFLICT (event_id, admin_user_id)
        WHERE revoked_at IS NULL
      DO UPDATE SET
        assigned_by_admin_user_id = EXCLUDED.assigned_by_admin_user_id,
        updated_at = now()
    `,
    [eventId, validatorId, assignedByAdminId],
    client,
  );
}

async function upsertSeedBibTemplate(
  event: EventRecord,
  client: PoolClient,
): Promise<string> {
  const templateId = stableUuid(`bib-template:${event.slug}`);
  const objectKey = `dev-seed/${event.slug}/bib-template.png`;
  const templateBuffer = await readSeedBibTemplate();

  await putPrivateObject({
    objectKey,
    body: templateBuffer,
    contentType: 'image/png',
  });

  const result = await query<{ id: string }>(
    `
      INSERT INTO bib_template_versions (
        id,
        event_id,
        object_key,
        canvas_width,
        canvas_height,
        file_size_bytes,
        checksum_sha256,
        version_number,
        is_active,
        name,
        description,
        status,
        updated_at
      )
      VALUES ($1, $2, $3, 1200, 800, $4, $5, 1, true, $6, $7, 'ACTIVE', now())
      ON CONFLICT (event_id, version_number)
      DO UPDATE SET
        object_key = EXCLUDED.object_key,
        is_active = true,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = 'ACTIVE',
        updated_at = now()
      RETURNING id
    `,
    [
      templateId,
      event.id,
      objectKey,
      templateBuffer.length,
      sha256Buffer(templateBuffer),
      `Template demo ${event.name}`,
      'Template BIB dummy development untuk storage lokal.',
    ],
    client,
  );
  const activeTemplateVersionId = result.rows[0].id;

  await query(
    `
      INSERT INTO event_bib_settings (
        event_id,
        bib_prefix,
        numeric_padding,
        text_color,
        font_family,
        active_template_version_id,
        updated_at
      )
      VALUES ($1, $2, 4, '#111827', 'Montserrat', $3, now())
      ON CONFLICT (event_id)
      DO UPDATE SET
        bib_prefix = EXCLUDED.bib_prefix,
        numeric_padding = EXCLUDED.numeric_padding,
        text_color = EXCLUDED.text_color,
        font_family = EXCLUDED.font_family,
        active_template_version_id = EXCLUDED.active_template_version_id,
        updated_at = now()
    `,
    [
      event.id,
      `${event.slug.split('-')[1]?.toUpperCase()?.slice(0, 3) ?? 'RUN'}-`,
      activeTemplateVersionId,
    ],
    client,
  );

  return activeTemplateVersionId;
}

async function seedEventsAndCategories(
  admin: AdminUser,
  eventAdmin: AdminUser,
  validator: AdminUser,
  client: PoolClient,
): Promise<SeedEventData[]> {
  const seededEvents: SeedEventData[] = [];

  const legacyEvent = await upsertSeedEventBySlug(
    legacyEventSlug,
    eventInput({
      ...eventDefinitions[0],
      name: 'Nusantara Virtual Run 2026',
      slug: legacyEventSlug,
      shortDescription:
        'Lari dari kota masing-masing, selesaikan target jarak pilihanmu, dan catat pencapaian dalam satu gerakan virtual bersama peserta dari seluruh Indonesia.',
    }),
    admin.id,
    client,
  );

  await updateSeedEventState(
    legacyEvent.id,
    eventDefinitions[0],
    admin.id,
    client,
  );
  await assignEventAdmins(
    legacyEvent.id,
    eventAdmin.id,
    validator.id,
    admin.id,
    client,
  );
  const legacyTemplateVersionId = await upsertSeedBibTemplate(
    legacyEvent,
    client,
  );
  const legacyCategories: EventCategoryRecord[] = [];

  for (const [index, category] of seedCategories.entries()) {
    legacyCategories.push(
      await upsertSeedCategory(
        legacyEvent.id,
        categoryInput(category, index + 1),
        client,
      ),
    );
  }

  seededEvents.push({
    ...eventDefinitions[0],
    event: legacyEvent,
    categories: legacyCategories,
    templateVersionId: legacyTemplateVersionId,
  });

  for (const definition of eventDefinitions) {
    const event = await upsertSeedEventBySlug(
      definition.slug,
      eventInput(definition),
      admin.id,
      client,
    );
    await updateSeedEventState(event.id, definition, admin.id, client);
    await assignEventAdmins(
      event.id,
      eventAdmin.id,
      validator.id,
      admin.id,
      client,
    );
    const templateVersionId = await upsertSeedBibTemplate(event, client);
    const categories: EventCategoryRecord[] = [];

    for (const [index, category] of definition.categories.entries()) {
      categories.push(
        await upsertSeedCategory(
          event.id,
          categoryInput(category, index + 1),
          client,
        ),
      );
    }

    seededEvents.push({
      ...definition,
      event,
      categories,
      templateVersionId,
    });
  }

  return seededEvents;
}

async function upsertSeedParticipant(
  index: number,
  client: PoolClient,
): Promise<SeedParticipant> {
  const name = `${participantNames[index % participantNames.length]} ${String(index + 1).padStart(2, '0')}`;
  const email = `participant${String(index + 1).padStart(3, '0')}@beard.test`;
  const gender =
    index % 11 === 0 ? 'OTHER' : index % 2 === 0 ? 'MALE' : 'FEMALE';
  const location = locations[index % locations.length];
  const birthYear = 1978 + (index % 28);

  const result = await query<{
    id: string;
    full_name: string;
    normalized_email: string;
    display_email: string;
    normalized_phone: string;
    display_phone: string;
    gender: SeedParticipant['gender'];
    date_of_birth: string | null;
    province: string | null;
    city: string | null;
    city_or_regency: string | null;
    district: string | null;
    postal_code: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    status: SeedParticipant['status'];
    deleted_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `
      INSERT INTO participants (
        full_name,
        normalized_email,
        display_email,
        normalized_phone,
        display_phone,
        gender,
        date_of_birth,
        province,
        city,
        city_or_regency,
        district,
        postal_code,
        emergency_contact_name,
        emergency_contact_phone,
        status,
        deleted_at
      )
      VALUES ($1, $2, $2, $3, $4, $5, $6::date, $7, $8, $8, $9, $10::text, $11, $12, 'ACTIVE', NULL)
      ON CONFLICT (normalized_email) WHERE deleted_at IS NULL
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        display_email = EXCLUDED.display_email,
        normalized_phone = EXCLUDED.normalized_phone,
        display_phone = EXCLUDED.display_phone,
        gender = EXCLUDED.gender,
        date_of_birth = EXCLUDED.date_of_birth,
        province = EXCLUDED.province,
        city = EXCLUDED.city,
        city_or_regency = EXCLUDED.city_or_regency,
        district = EXCLUDED.district,
        postal_code = EXCLUDED.postal_code,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        status = 'ACTIVE',
        deleted_at = NULL,
        updated_at = now()
      RETURNING
        id,
        full_name,
        normalized_email,
        display_email,
        normalized_phone,
        display_phone,
        gender,
        date_of_birth::text,
        province,
        city,
        city_or_regency,
        district,
        postal_code,
        emergency_contact_name,
        emergency_contact_phone,
        status,
        deleted_at,
        created_at,
        updated_at
    `,
    [
      name,
      email,
      normalizedPhone(index + 1),
      displayPhone(index + 1),
      gender,
      `${birthYear}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
      location[0],
      location[1],
      location[2],
      location[3],
      `Kontak Darurat ${index + 1}`,
      displayPhone(index + 401),
    ],
    client,
  );
  const row = result.rows[0];

  return {
    id: row.id,
    fullName: row.full_name,
    normalizedEmail: row.normalized_email,
    displayEmail: row.display_email,
    normalizedPhone: row.normalized_phone,
    displayPhone: row.display_phone,
    instagramUsername: null,
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
    index,
  };
}

async function findSeedRegistration(
  eventId: string,
  participantId: string,
  client: PoolClient,
): Promise<EventRegistrationRecord | null> {
  const result = await query<{
    id: string;
    event_id: string;
    participant_id: string;
    registration_code_lookup: string;
    registration_code_hash: string;
    bib_sequence: number;
    bib_number: string;
    registration_status: EventRegistrationRecord['registrationStatus'];
    bib_status: BibStatus;
    bib_document_id: string | null;
    bib_error: string | null;
    email_status: EmailStatus;
    registered_at: Date;
    terms_version: string;
    terms_accepted_at: Date;
    privacy_accepted_at: Date;
    source: string | null;
    created_at: Date;
    updated_at: Date;
    cancelled_at: Date | null;
  }>(
    `
      SELECT
        id,
        event_id,
        participant_id,
        registration_code_lookup,
        registration_code_hash,
        bib_sequence,
        bib_number,
        registration_status,
        bib_status,
        bib_document_id,
        bib_error,
        email_status,
        registered_at,
        terms_version,
        terms_accepted_at,
        privacy_accepted_at,
        source,
        created_at,
        updated_at,
        cancelled_at
      FROM event_registrations
      WHERE event_id = $1
        AND participant_id = $2
      LIMIT 1
    `,
    [eventId, participantId],
    client,
  );
  const row = result.rows[0];

  return row
    ? {
        id: row.id,
        eventId: row.event_id,
        participantId: row.participant_id,
        registrationCodeLookup: row.registration_code_lookup,
        registrationCodeHash: row.registration_code_hash,
        bibSequence: row.bib_sequence,
        bibNumber: row.bib_number,
        registrationStatus: row.registration_status,
        bibStatus: row.bib_status,
        bibDocumentId: row.bib_document_id,
        bibError: row.bib_error,
        emailStatus: row.email_status,
        registeredAt: row.registered_at,
        termsVersion: row.terms_version,
        termsAcceptedAt: row.terms_accepted_at,
        privacyAcceptedAt: row.privacy_accepted_at,
        source: row.source,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        cancelledAt: row.cancelled_at,
      }
    : null;
}

async function upsertSeedRegistration(
  input: {
    event: SeedEventData;
    participant: SeedParticipant;
    bibStatus: BibStatus;
    emailStatus: EmailStatus;
    registrationStatus: EventRegistrationRecord['registrationStatus'];
    registeredAt: Date;
  },
  client: PoolClient,
): Promise<EventRegistrationRecord> {
  const existing = await findSeedRegistration(
    input.event.event.id,
    input.participant.id,
    client,
  );
  const registrationCodeHash = sha256(
    `registration-code:${input.event.event.slug}:${input.participant.normalizedEmail}`,
  );
  const registrationCodeLookup = registrationCodeHash
    .slice(0, 12)
    .toUpperCase();
  let registration = existing;

  if (!registration) {
    const bibSettings = await getOrCreateBibSettingsForUpdate(
      input.event.event.id,
      client,
    );
    const bibSequence = bibSettings.next_sequence;
    const bibNumber = formatBibNumber({
      sequence: bibSequence,
      prefix: bibSettings.bib_prefix,
      suffix: bibSettings.bib_suffix,
      padding: bibSettings.numeric_padding,
    });

    await advanceBibSequence(input.event.event.id, bibSequence + 1, client);

    const result = await query<{
      id: string;
    }>(
      `
        INSERT INTO event_registrations (
          event_id,
          participant_id,
          registration_code_lookup,
          registration_code_hash,
          bib_sequence,
          bib_number,
          registration_status,
          bib_status,
          email_status,
          registered_at,
          terms_version,
          terms_accepted_at,
          privacy_accepted_at,
          source,
          cancelled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz, 'dev-seed-v1', $10::timestamptz, $10::timestamptz, $11, CASE WHEN $7::text = 'CANCELLED' THEN $10::timestamptz ELSE NULL END)
        RETURNING id
      `,
      [
        input.event.event.id,
        input.participant.id,
        registrationCodeLookup,
        registrationCodeHash,
        bibSequence,
        bibNumber,
        input.registrationStatus,
        input.bibStatus,
        input.emailStatus,
        input.registeredAt,
        seedSource,
      ],
      client,
    );

    registration = await findSeedRegistration(
      input.event.event.id,
      input.participant.id,
      client,
    );

    if (!registration || registration.id !== result.rows[0].id) {
      throw new Error('Development registration could not be created');
    }
  } else {
    await query(
      `
        UPDATE event_registrations
        SET
          registration_code_lookup = $3,
          registration_code_hash = $4,
          registration_status = $5::text,
          bib_status = $6::text,
          email_status = $7::text,
          registered_at = $8::timestamptz,
          terms_version = 'dev-seed-v1',
          terms_accepted_at = $8::timestamptz,
          privacy_accepted_at = $8::timestamptz,
          source = $9,
          cancelled_at = CASE WHEN $5::text = 'CANCELLED' THEN $8::timestamptz ELSE NULL END,
          bib_error = CASE WHEN $6::text = 'FAILED' THEN 'Template demo gagal diproses.' ELSE NULL END,
          updated_at = now()
        WHERE id = $1
          AND event_id = $2
      `,
      [
        registration.id,
        input.event.event.id,
        registrationCodeLookup,
        registrationCodeHash,
        input.registrationStatus,
        input.bibStatus,
        input.emailStatus,
        input.registeredAt,
        seedSource,
      ],
      client,
    );

    registration = await findSeedRegistration(
      input.event.event.id,
      input.participant.id,
      client,
    );
  }

  if (!registration) {
    throw new Error('Development registration was not available after upsert');
  }

  if (input.bibStatus === 'READY') {
    const bibDocumentId = await upsertSeedBibDocument(
      input.event,
      input.participant,
      registration,
      client,
    );
    await query(
      `
        UPDATE event_registrations
        SET bib_status = 'READY', bib_document_id = $2, bib_error = NULL, updated_at = now()
        WHERE id = $1
      `,
      [registration.id, bibDocumentId],
      client,
    );
  } else {
    await query(
      `
        UPDATE event_registrations
        SET bib_status = $2, bib_document_id = NULL, bib_error = $3, updated_at = now()
        WHERE id = $1
      `,
      [
        registration.id,
        input.bibStatus,
        input.bibStatus === 'FAILED' ? 'Template demo gagal diproses.' : null,
      ],
      client,
    );
  }

  await upsertEmailDelivery(
    registration.id,
    input.participant.displayEmail,
    input.emailStatus,
    client,
  );

  const refreshed = await findSeedRegistration(
    input.event.event.id,
    input.participant.id,
    client,
  );
  if (!refreshed) {
    throw new Error('Development registration could not be refreshed');
  }
  return refreshed;
}

async function upsertSeedBibDocument(
  event: SeedEventData,
  participant: SeedParticipant,
  registration: EventRegistrationRecord,
  client: PoolClient,
): Promise<string> {
  const id = stableUuid(
    `bib-document:${event.event.slug}:${participant.normalizedEmail}`,
  );
  const objectKey = `dev-seed/${event.event.slug}/participants/${participant.id}/bib/${id}.png`;

  await query(
    `
      INSERT INTO bib_documents (
        id,
        event_registration_id,
        event_id,
        participant_id,
        template_version_id,
        object_key,
        status,
        attempt_count,
        generated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'READY', 1, now())
      ON CONFLICT (object_key)
      DO UPDATE SET
        event_registration_id = EXCLUDED.event_registration_id,
        event_id = EXCLUDED.event_id,
        participant_id = EXCLUDED.participant_id,
        template_version_id = EXCLUDED.template_version_id,
        status = 'READY',
        attempt_count = 1,
        generated_at = now()
    `,
    [
      id,
      registration.id,
      event.event.id,
      participant.id,
      event.templateVersionId,
      objectKey,
    ],
    client,
  );

  return id;
}

async function upsertEmailDelivery(
  registrationId: string,
  recipientEmail: string,
  status: EmailStatus,
  client: PoolClient,
): Promise<void> {
  const id = stableUuid(`email-delivery:${registrationId}:registration`);

  await query(
    `
      INSERT INTO email_deliveries (
        id,
        event_registration_id,
        email_type,
        recipient_email,
        status,
        attempts,
        last_error,
        sent_at,
        updated_at
      )
      VALUES ($1, $2, 'REGISTRATION_CONFIRMATION', $3, $4, CASE WHEN $4 = 'PENDING' THEN 0 ELSE 1 END, CASE WHEN $4 = 'FAILED' THEN 'Email demo gagal dikirim.' ELSE NULL END, CASE WHEN $4 = 'SENT' THEN now() ELSE NULL END, now())
      ON CONFLICT (id)
      DO UPDATE SET
        recipient_email = EXCLUDED.recipient_email,
        status = EXCLUDED.status,
        attempts = EXCLUDED.attempts,
        last_error = EXCLUDED.last_error,
        sent_at = EXCLUDED.sent_at,
        updated_at = now()
    `,
    [id, registrationId, recipientEmail, status],
    client,
  );
}

function eligibleCategories(
  event: SeedEventData,
  participant: SeedParticipant,
): EventCategoryRecord[] {
  return event.categories.filter((category) => {
    if (
      !category.genderDivision ||
      category.genderDivision === 'OPEN' ||
      category.genderDivision === 'MIXED'
    ) {
      return true;
    }

    return category.genderDivision === participant.gender;
  });
}

async function seedRegistrations(
  events: SeedEventData[],
  participants: SeedParticipant[],
  client: PoolClient,
): Promise<SeedRegistrationCategory[]> {
  const registrationCategories: SeedRegistrationCategory[] = [];
  const publicEvents = events.filter(
    (event) => event.publicationStatus === 'PUBLISHED',
  );

  for (const participant of participants) {
    const eventIndexes = [participant.index % publicEvents.length];

    if (participant.index < 45) {
      eventIndexes.push((participant.index + 2) % publicEvents.length);
    }

    for (const [eventOffset, eventIndex] of eventIndexes.entries()) {
      const event = publicEvents[eventIndex];
      const bibStatuses: BibStatus[] = [
        'READY',
        'READY',
        'READY',
        'PENDING',
        'PROCESSING',
        'FAILED',
      ];
      const emailStatuses: EmailStatus[] = [
        'SENT',
        'SENT',
        'PENDING',
        'FAILED',
      ];
      const registrationStatus =
        participant.index % 17 === 0 && eventOffset === 1
          ? 'CANCELLED'
          : 'ACTIVE';
      const registration = await upsertSeedRegistration(
        {
          event,
          participant,
          bibStatus:
            bibStatuses[(participant.index + eventIndex) % bibStatuses.length],
          emailStatus:
            emailStatuses[
              (participant.index + eventIndex) % emailStatuses.length
            ],
          registrationStatus,
          registeredAt: new Date(
            event.registrationStartsAt.getTime() +
              (participant.index % 21) * 86_400_000,
          ),
        },
        client,
      );
      const categories = eligibleCategories(event, participant);
      const selectedCategories =
        participant.index % 5 === 0 && categories.length > 1
          ? categories.slice(0, 2)
          : [categories[participant.index % categories.length]];

      for (const category of selectedCategories) {
        const registrationCategory = await upsertSeedRegistrationCategory(
          registration.id,
          category.id,
          client,
        );

        if (registrationStatus === 'CANCELLED') {
          await query(
            `
              UPDATE registration_categories
              SET registration_status = 'CANCELLED', cancelled_at = $2, updated_at = now()
              WHERE id = $1
            `,
            [registrationCategory.id, registration.registeredAt],
            client,
          );
        } else {
          await query(
            `
              UPDATE registration_categories
              SET registration_status = 'ACTIVE', cancelled_at = NULL, updated_at = now()
              WHERE id = $1
            `,
            [registrationCategory.id],
            client,
          );
        }

        registrationCategories.push({
          id: registrationCategory.id,
          event,
          category,
          registration,
          participant,
        });
      }
    }
  }

  return registrationCategories;
}

async function upsertSeedRegistrationCategory(
  registrationId: string,
  categoryId: string,
  client: PoolClient,
): Promise<{ id: string }> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO registration_categories (
        event_registration_id,
        event_category_id,
        registration_status,
        cancelled_at
      )
      VALUES ($1, $2, 'ACTIVE', NULL)
      ON CONFLICT (event_registration_id, event_category_id)
      DO UPDATE SET
        registration_status = 'ACTIVE',
        cancelled_at = NULL,
        updated_at = now()
      RETURNING id
    `,
    [registrationId, categoryId],
    client,
  );

  return result.rows[0];
}

async function seedSubmissions(
  registrationCategories: SeedRegistrationCategory[],
  validator: AdminUser,
  client: PoolClient,
): Promise<void> {
  const scenarios: SubmissionScenario[] = [
    'NONE',
    'SUBMITTED',
    'UNDER_REVIEW_ACTIVE',
    'UNDER_REVIEW_EXPIRED',
    'APPROVED',
    'REVISION_REQUIRED',
    'REJECTED',
    'DISQUALIFIED',
  ];
  const activeCategories = registrationCategories.filter(
    (item) =>
      item.registration.registrationStatus === 'ACTIVE' &&
      item.event.status !== 'SCHEDULED' &&
      item.event.status !== 'DRAFT',
  );

  for (const [index, registrationCategory] of activeCategories
    .slice(0, 96)
    .entries()) {
    const scenario = scenarios[index % scenarios.length];

    if (scenario === 'NONE') {
      await clearSeedSubmission(registrationCategory.id, client);
      continue;
    }

    await upsertSeedSubmission(
      registrationCategory,
      scenario,
      index,
      validator.id,
      client,
    );
  }
}

async function clearSeedSubmission(
  registrationCategoryId: string,
  client: PoolClient,
): Promise<void> {
  const result = await query<{ id: string }>(
    `
      SELECT id
      FROM submissions
      WHERE registration_category_id = $1
      LIMIT 1
    `,
    [registrationCategoryId],
    client,
  );
  const submissionId = result.rows[0]?.id;

  if (!submissionId) {
    return;
  }

  await query(
    `
      DELETE FROM validation_reviews
      WHERE submission_id = $1
        AND metadata->>'seed' = $2
    `,
    [submissionId, seedSource],
    client,
  );
}

function submissionStatusForScenario(
  scenario: SubmissionScenario,
): SubmissionStatus {
  if (
    scenario === 'UNDER_REVIEW_ACTIVE' ||
    scenario === 'UNDER_REVIEW_EXPIRED'
  ) {
    return 'UNDER_REVIEW';
  }

  if (scenario === 'REVISION_REQUIRED') {
    return 'REVISION_REQUIRED';
  }

  return scenario as SubmissionStatus;
}

async function upsertSeedSubmission(
  registrationCategory: SeedRegistrationCategory,
  scenario: SubmissionScenario,
  index: number,
  validatorId: string,
  client: PoolClient,
): Promise<void> {
  const seedSubmissionId = stableUuid(`submission:${registrationCategory.id}`);
  const revisionCount = index % 6 === 0 ? 2 : 1;
  const status = submissionStatusForScenario(scenario);
  const submittedAt = new Date(
    registrationCategory.event.uploadStartsAt.getTime() +
      (index % 18) * 3_600_000,
  );
  const reviewClaimedAt =
    scenario === 'UNDER_REVIEW_ACTIVE'
      ? new Date(Date.now() - 10 * 60_000)
      : scenario === 'UNDER_REVIEW_EXPIRED'
        ? new Date(Date.now() - 120 * 60_000)
        : null;
  const reviewClaimExpiresAt =
    scenario === 'UNDER_REVIEW_ACTIVE'
      ? new Date(Date.now() + 60 * 60_000)
      : scenario === 'UNDER_REVIEW_EXPIRED'
        ? new Date(Date.now() - 60 * 60_000)
        : null;

  const submissionResult = await query<{ id: string }>(
    `
      INSERT INTO submissions (
        id,
        registration_category_id,
        status,
        revision_count,
        first_submitted_at,
        last_submitted_at,
        current_revision_id,
        review_claimed_by_admin_user_id,
        review_claimed_at,
        review_claim_expires_at,
        approved_revision_id,
        approved_by_admin_user_id,
        approved_at,
        reviewed_at,
        validation_completed_at,
        ranking_eligible,
        ranking_exclusion_reason,
        latest_participant_visible_note,
        latest_validation_reason_code,
        updated_at
      )
      VALUES (
        $1, $2, $3::text, $4, $5::timestamptz, $5::timestamptz, NULL,
        $6, $7::timestamptz, $8::timestamptz,
        NULL, NULL, NULL, CASE WHEN $3::text IN ('APPROVED', 'REJECTED', 'DISQUALIFIED', 'REVISION_REQUIRED') THEN $5::timestamptz ELSE NULL END,
        CASE WHEN $3::text IN ('APPROVED', 'REJECTED', 'DISQUALIFIED', 'REVISION_REQUIRED') THEN $5::timestamptz ELSE NULL END,
        false, NULL, NULL, NULL, now()
      )
      ON CONFLICT (registration_category_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        revision_count = EXCLUDED.revision_count,
        first_submitted_at = EXCLUDED.first_submitted_at,
        last_submitted_at = EXCLUDED.last_submitted_at,
        review_claimed_by_admin_user_id = EXCLUDED.review_claimed_by_admin_user_id,
        review_claimed_at = EXCLUDED.review_claimed_at,
        review_claim_expires_at = EXCLUDED.review_claim_expires_at,
        approved_revision_id = NULL,
        approved_by_admin_user_id = NULL,
        approved_at = NULL,
        reviewed_at = EXCLUDED.reviewed_at,
        validation_completed_at = EXCLUDED.validation_completed_at,
        ranking_eligible = false,
        ranking_exclusion_reason = NULL,
        latest_participant_visible_note = NULL,
        latest_validation_reason_code = NULL,
        updated_at = now()
      RETURNING id
    `,
    [
      seedSubmissionId,
      registrationCategory.id,
      status,
      revisionCount,
      submittedAt,
      scenario === 'UNDER_REVIEW_ACTIVE' || scenario === 'UNDER_REVIEW_EXPIRED'
        ? validatorId
        : null,
      reviewClaimedAt,
      reviewClaimExpiresAt,
    ],
    client,
  );
  const submissionId = submissionResult.rows[0].id;
  let currentRevisionId = '';

  for (
    let revisionNumber = 1;
    revisionNumber <= revisionCount;
    revisionNumber += 1
  ) {
    const seedRevisionId = stableUuid(
      `submission-revision:${registrationCategory.id}:${revisionNumber}`,
    );
    const revisionId = await upsertSeedRevision(
      registrationCategory,
      submissionId,
      seedRevisionId,
      revisionNumber,
      revisionCount,
      index,
      client,
    );

    if (revisionNumber === revisionCount) {
      currentRevisionId = revisionId;
    }
  }

  await upsertSeedUploadAndFile(
    registrationCategory,
    submissionId,
    currentRevisionId,
    index,
    client,
  );

  await query(
    `
      UPDATE submissions
      SET
        current_revision_id = $2::uuid,
        approved_revision_id = CASE WHEN $3::text = 'APPROVED' THEN $2::uuid ELSE NULL END,
        approved_by_admin_user_id = CASE WHEN $3::text = 'APPROVED' THEN $4::uuid ELSE NULL END,
        approved_at = CASE WHEN $3::text = 'APPROVED' THEN last_submitted_at ELSE NULL END,
        ranking_eligible = CASE WHEN $3::text = 'APPROVED' THEN true ELSE false END,
        ranking_exclusion_reason = CASE
          WHEN $3::text = 'REJECTED' THEN 'Tidak memenuhi ketentuan event.'
          WHEN $3::text = 'DISQUALIFIED' THEN 'Diskualifikasi berdasarkan keputusan organizer.'
          ELSE NULL
        END,
        latest_participant_visible_note = CASE
          WHEN $3::text = 'REVISION_REQUIRED' THEN 'Mohon upload ulang bukti aktivitas dengan jarak yang lebih jelas.'
          WHEN $3::text = 'REJECTED' THEN 'Hasil belum dapat diterima karena bukti aktivitas tidak valid.'
          WHEN $3::text = 'DISQUALIFIED' THEN 'Submission didiskualifikasi karena pelanggaran ketentuan event.'
          ELSE NULL
        END,
        latest_validation_reason_code = CASE
          WHEN $3::text = 'REVISION_REQUIRED' THEN 'DISTANCE_NEEDS_CLARIFICATION'
          WHEN $3::text = 'REJECTED' THEN 'INVALID_OR_UNSUPPORTED_EVIDENCE'
          WHEN $3::text = 'DISQUALIFIED' THEN 'SERIOUS_RULE_VIOLATION'
          ELSE NULL
        END,
        updated_at = now()
      WHERE id = $1::uuid
    `,
    [submissionId, currentRevisionId, status, validatorId],
    client,
  );

  await upsertSeedValidationReviews(
    submissionId,
    currentRevisionId,
    registrationCategory,
    scenario,
    validatorId,
    client,
  );
}

async function upsertSeedRevision(
  registrationCategory: SeedRegistrationCategory,
  submissionId: string,
  revisionId: string,
  revisionNumber: number,
  revisionCount: number,
  index: number,
  client: PoolClient,
): Promise<string> {
  const distanceOffset = revisionNumber === revisionCount ? index % 350 : -900;
  const distanceMeter = Math.max(
    1,
    registrationCategory.category.distanceMeters + distanceOffset,
  );
  const elapsedSeconds = Math.round(
    (distanceMeter / 1000) * (330 + (index % 90)),
  );
  const platforms: ActivityPlatform[] = [
    'STRAVA',
    'GARMIN_CONNECT',
    'NIKE_RUN_CLUB',
    'TREADMILL',
    'OTHER',
  ];
  const platform = platforms[index % platforms.length];

  const result = await query<{ id: string }>(
    `
      INSERT INTO submission_revisions (
        id,
        submission_id,
        revision_number,
        activity_date,
        distance_meter,
        elapsed_time_seconds,
        moving_time_seconds,
        activity_platform,
        activity_platform_other,
        activity_url,
        normalized_activity_url,
        participant_note,
        submitted_at,
        superseded_at
      )
      VALUES ($1, $2, $3::integer, $4::date, $5, $6, $7, $8, $9, $10::text, $10::text, $11, $12::timestamptz, CASE WHEN $3::integer < $13::integer THEN $12::timestamptz ELSE NULL END)
      ON CONFLICT (submission_id, revision_number)
      DO UPDATE SET
        activity_date = EXCLUDED.activity_date,
        distance_meter = EXCLUDED.distance_meter,
        elapsed_time_seconds = EXCLUDED.elapsed_time_seconds,
        moving_time_seconds = EXCLUDED.moving_time_seconds,
        activity_platform = EXCLUDED.activity_platform,
        activity_platform_other = EXCLUDED.activity_platform_other,
        activity_url = EXCLUDED.activity_url,
        normalized_activity_url = EXCLUDED.normalized_activity_url,
        participant_note = EXCLUDED.participant_note,
        submitted_at = EXCLUDED.submitted_at,
        superseded_at = EXCLUDED.superseded_at
      RETURNING id
    `,
    [
      revisionId,
      submissionId,
      revisionNumber,
      registrationCategory.event.activityStartsAt.toISOString().slice(0, 10),
      distanceMeter,
      elapsedSeconds,
      Math.max(60, elapsedSeconds - 30),
      platform,
      platform === 'OTHER' ? 'Aplikasi demo' : null,
      `https://activity.beard.test/${registrationCategory.event.event.slug}/${registrationCategory.registration.bibNumber.toLowerCase()}/r${revisionNumber}`,
      `Revisi ${revisionNumber} dari data development.`,
      new Date(
        registrationCategory.event.uploadStartsAt.getTime() +
          (index + revisionNumber) * 3_600_000,
      ),
      revisionCount,
    ],
    client,
  );

  return result.rows[0].id;
}

async function upsertSeedUploadAndFile(
  registrationCategory: SeedRegistrationCategory,
  submissionId: string,
  revisionId: string,
  index: number,
  client: PoolClient,
): Promise<void> {
  const uploadSessionId = stableUuid(`upload-session:${revisionId}`);
  const fileId = stableUuid(`submission-file:${revisionId}`);
  const objectKey = `dev-seed/${registrationCategory.event.event.slug}/submissions/${submissionId}/revisions/${revisionId}/${fileId}.jpg`;

  await query(
    `
      INSERT INTO upload_sessions (
        id,
        participant_id,
        event_registration_id,
        registration_category_id,
        purpose,
        expected_mime_type,
        maximum_size_bytes,
        object_key,
        status,
        expires_at,
        finalized_at
      )
      VALUES ($1, $2, $3, $4, 'SUBMISSION_SCREENSHOT', 'image/*', 5242880, $5, 'READY', now() + interval '1 hour', now())
      ON CONFLICT (object_key)
      DO UPDATE SET
        status = 'READY',
        finalized_at = now()
    `,
    [
      uploadSessionId,
      registrationCategory.participant.id,
      registrationCategory.registration.id,
      registrationCategory.id,
      objectKey,
    ],
    client,
  );

  await query(
    `
      INSERT INTO submission_files (
        id,
        submission_revision_id,
        upload_session_id,
        object_key,
        thumbnail_object_key,
        original_filename,
        original_mime_type,
        detected_mime_type,
        size_bytes,
        width,
        height,
        checksum_sha256,
        status,
        finalized_at
      )
      VALUES ($1, $2, $3, $4, NULL, $5, 'image/jpeg', 'image/jpeg', $6, 1080, 1920, $7, 'READY', now())
      ON CONFLICT (object_key)
      DO UPDATE SET
        submission_revision_id = EXCLUDED.submission_revision_id,
        upload_session_id = EXCLUDED.upload_session_id,
        original_filename = EXCLUDED.original_filename,
        size_bytes = EXCLUDED.size_bytes,
        checksum_sha256 = EXCLUDED.checksum_sha256,
        status = 'READY',
        finalized_at = now()
    `,
    [
      fileId,
      revisionId,
      uploadSessionId,
      objectKey,
      `hasil-lari-${registrationCategory.registration.bibNumber}.jpg`,
      240_000 + index * 127,
      sha256(objectKey),
    ],
    client,
  );
}

async function upsertSeedValidationReviews(
  submissionId: string,
  revisionId: string,
  registrationCategory: SeedRegistrationCategory,
  scenario: SubmissionScenario,
  validatorId: string,
  client: PoolClient,
): Promise<void> {
  if (scenario === 'SUBMITTED' || scenario === 'NONE') {
    return;
  }

  const status = submissionStatusForScenario(scenario);
  const reviewAction =
    scenario === 'APPROVED'
      ? 'APPROVE'
      : scenario === 'REVISION_REQUIRED'
        ? 'REQUEST_REVISION'
        : scenario === 'REJECTED'
          ? 'REJECT'
          : scenario === 'DISQUALIFIED'
            ? 'DISQUALIFY'
            : 'START_REVIEW';
  const reasonCode =
    scenario === 'REVISION_REQUIRED'
      ? 'DISTANCE_NEEDS_CLARIFICATION'
      : scenario === 'REJECTED'
        ? 'INVALID_OR_UNSUPPORTED_EVIDENCE'
        : scenario === 'DISQUALIFIED'
          ? 'SERIOUS_RULE_VIOLATION'
          : null;

  await upsertValidationReview(
    {
      id: stableUuid(`validation-review:${submissionId}:start`),
      submissionId,
      revisionId,
      eventId: registrationCategory.event.event.id,
      registrationCategoryId: registrationCategory.id,
      reviewerId: validatorId,
      action: 'START_REVIEW',
      previousStatus: 'SUBMITTED',
      resultingStatus: 'UNDER_REVIEW',
      reasonCode: null,
      participantVisibleNote: null,
      internalNote: 'Claim review dari seed development.',
    },
    client,
  );

  if (reviewAction === 'START_REVIEW') {
    return;
  }

  await upsertValidationReview(
    {
      id: stableUuid(`validation-review:${submissionId}:${reviewAction}`),
      submissionId,
      revisionId,
      eventId: registrationCategory.event.event.id,
      registrationCategoryId: registrationCategory.id,
      reviewerId: validatorId,
      action: reviewAction,
      previousStatus: 'UNDER_REVIEW',
      resultingStatus: status,
      reasonCode,
      participantVisibleNote:
        scenario === 'APPROVED'
          ? 'Hasil lari sudah diverifikasi.'
          : scenario === 'REVISION_REQUIRED'
            ? 'Mohon upload ulang bukti aktivitas dengan jarak yang lebih jelas.'
            : scenario === 'REJECTED'
              ? 'Hasil belum dapat diterima karena bukti aktivitas tidak valid.'
              : 'Submission didiskualifikasi karena pelanggaran ketentuan event.',
      internalNote: `Keputusan ${reviewAction.toLowerCase().replace(/_/g, ' ')} dari seed development.`,
    },
    client,
  );
}

async function upsertValidationReview(
  input: {
    id: string;
    submissionId: string;
    revisionId: string;
    eventId: string;
    registrationCategoryId: string;
    reviewerId: string;
    action: string;
    previousStatus: SubmissionStatus;
    resultingStatus: SubmissionStatus;
    reasonCode: string | null;
    participantVisibleNote: string | null;
    internalNote: string | null;
  },
  client: PoolClient,
): Promise<void> {
  await query(
    `
      INSERT INTO validation_reviews (
        id,
        submission_id,
        submission_revision_id,
        event_id,
        registration_category_id,
        reviewer_admin_user_id,
        action,
        previous_status,
        resulting_status,
        reason_code,
        participant_visible_note,
        internal_note,
        metadata,
        reviewed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text, $11, $12, $13::jsonb, now())
      ON CONFLICT (id)
      DO UPDATE SET
        submission_revision_id = EXCLUDED.submission_revision_id,
        reviewer_admin_user_id = EXCLUDED.reviewer_admin_user_id,
        action = EXCLUDED.action,
        previous_status = EXCLUDED.previous_status,
        resulting_status = EXCLUDED.resulting_status,
        reason_code = EXCLUDED.reason_code,
        participant_visible_note = EXCLUDED.participant_visible_note,
        internal_note = EXCLUDED.internal_note,
        metadata = EXCLUDED.metadata,
        reviewed_at = now()
    `,
    [
      input.id,
      input.submissionId,
      input.revisionId,
      input.eventId,
      input.registrationCategoryId,
      input.reviewerId,
      input.action,
      input.previousStatus,
      input.resultingStatus,
      input.reasonCode,
      input.participantVisibleNote,
      input.internalNote,
      JSON.stringify({ seed: seedSource }),
    ],
    client,
  );
}

async function seedDevelopmentData() {
  await runMigrations();

  await withTransaction(async (client) => {
    const passwordHash = await hashAdminPassword(env.DEV_ADMIN_PASSWORD);
    const admins = {
      superAdmin: await upsertDevAdmin(
        'superAdmin',
        {
          email: env.DEV_ADMIN_EMAIL,
          name: 'Development Super Admin',
        },
        passwordHash,
        client,
      ),
      eventAdmin: await upsertDevAdmin(
        'eventAdmin',
        {
          email: 'event.admin@beard.test',
          name: 'Development Event Admin',
        },
        passwordHash,
        client,
      ),
      validator: await upsertDevAdmin(
        'validator',
        {
          email: 'validator@beard.test',
          name: 'Development Validator',
        },
        passwordHash,
        client,
      ),
      reporter: await upsertDevAdmin(
        'reporter',
        {
          email: 'reporter@beard.test',
          name: 'Development Reporter',
        },
        passwordHash,
        client,
      ),
    };

    const events = await seedEventsAndCategories(
      admins.superAdmin,
      admins.eventAdmin,
      admins.validator,
      client,
    );
    const participants: SeedParticipant[] = [];

    for (let index = 0; index < 80; index += 1) {
      participants.push(await upsertSeedParticipant(index, client));
    }

    const registrationCategories = await seedRegistrations(
      events,
      participants,
      client,
    );
    await seedSubmissions(registrationCategories, admins.validator, client);

    logger.info('Development seed completed', {
      adminEmail: env.DEV_ADMIN_EMAIL.trim().toLowerCase(),
      eventCount: events.length,
      participantCount: participants.length,
      registrationCategoryCount: registrationCategories.length,
      source: seedSource,
    });
  });
}

seedDevelopmentData().catch((error: unknown) => {
  const databaseError = error as {
    code?: string;
    detail?: string;
    position?: string;
    where?: string;
    stack?: string;
  };

  logger.error('Development seed failed', {
    message: error instanceof Error ? error.message : 'Unknown error',
    code: databaseError.code,
    detail: databaseError.detail,
    position: databaseError.position,
    where: databaseError.where,
    stack: databaseError.stack,
  });
  process.exitCode = 1;
});
