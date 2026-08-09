import { runMigrations } from "@/db/migrate";
import { withTransaction } from "@/db/transaction";
import { ensureAdminRole, upsertDevelopmentAdminUser } from "@/modules/auth/auth.repository";
import { hashAdminPassword } from "@/modules/auth/password";
import { upsertSeedCategory } from "@/modules/categories/category.repository";
import type { CategoryInput } from "@/modules/categories/category.types";
import { upsertSeedEventBySlug } from "@/modules/events/event.repository";
import type { EventInput } from "@/modules/events/event.types";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logging/logger";

const eventSlug = "nusantara-virtual-run-2026";

const seedEvent: EventInput = {
  name: "Nusantara Virtual Run 2026",
  slug: eventSlug,
  shortDescription:
    "Lari dari kota masing-masing, selesaikan target jarak pilihanmu, dan catat pencapaian dalam satu gerakan virtual bersama peserta dari seluruh Indonesia.",
  fullDescription:
    "Nusantara Virtual Run 2026 mengajak peserta berlari dari kota masing-masing dengan target jarak yang jelas dan periode aktivitas yang terukur.\n\nEvent ini dirancang untuk peserta yang ingin menjaga ritme latihan, menyelesaikan tantangan pribadi, dan tetap mengikuti format event yang rapi meskipun dilakukan secara virtual.",
  termsAndConditions:
    "Peserta wajib menyelesaikan jarak sesuai kategori dalam periode aktivitas event.\n\nHasil aktivitas harus berasal dari aplikasi pencatat lari atau bukti aktivitas yang dapat diverifikasi. Organizer berhak menolak hasil yang tidak sesuai ketentuan event.",
  registrationInstructions:
    "Pada tahap berikutnya, peserta akan memilih kategori, mengisi data pribadi, menyetujui syarat event, lalu menerima kode registrasi dan BIB digital.",
  uploadInstructions:
    "Pada tahap berikutnya, peserta akan mengunggah tautan aktivitas atau screenshot hasil lari melalui halaman upload tanpa perlu membuat akun.",
  registrationStartsAt: new Date("2026-08-01T00:00:00+07:00"),
  registrationEndsAt: new Date("2026-08-31T23:59:00+07:00"),
  activityStartsAt: new Date("2026-09-01T00:00:00+07:00"),
  activityEndsAt: new Date("2026-09-30T23:59:00+07:00"),
  uploadStartsAt: new Date("2026-09-01T00:00:00+07:00"),
  uploadEndsAt: new Date("2026-10-03T23:59:00+07:00"),
  bannerObjectKey: "/events/nusantara-virtual-run-2026/banner.png",
  thumbnailObjectKey: "/events/nusantara-virtual-run-2026/banner.png",
  maximumParticipants: null,
  contactEmail: "organizer@beard.test",
  contactPhone: "+6281234567890",
  contactWhatsapp: "+6281234567890",
  brandPrimaryColor: "#0f766e",
  seoTitle: "Nusantara Virtual Run 2026 - VirtualRun",
  seoDescription: "Event virtual run Nusantara dengan kategori 5K, 10K, dan 21K.",
  seoIndexEnabled: true,
  publicVisibilityEnabled: true,
  participantBenefits: [
    {
      key: "e-bib",
      label: "E-BIB Digital",
      description: "BIB number otomatis untuk peserta.",
      enabled: true,
    },
    {
      key: "e-certificate",
      label: "E-Sertifikat Finisher",
      description: "Sertifikat digital untuk hasil yang terverifikasi.",
      enabled: true,
    },
  ],
  racePackEnabled: false,
  emergencyContactEnabled: false,
  faqItems: [
    {
      question: "Apakah event ini dilakukan di lokasi tertentu?",
      answer:
        "Tidak. Peserta dapat berlari dari kota masing-masing selama periode aktivitas event.",
    },
    {
      question: "Apakah peserta perlu membuat akun?",
      answer:
        "Tidak. Flow peserta dirancang tanpa akun. Kode registrasi akan digunakan pada tahap upload hasil.",
    },
    {
      question: "Kapan pendaftaran dan upload hasil tersedia?",
      answer:
        "Fitur pendaftaran dan upload hasil akan diaktifkan pada fase berikutnya setelah fondasi event management selesai.",
    },
  ],
};

const seedCategories: CategoryInput[] = [
  {
    name: "5K Challenge",
    slug: "5k-challenge",
    description: "Kategori pendek untuk peserta yang ingin menjaga ritme latihan mingguan.",
    distanceMeters: 5_000,
    distanceToleranceMeters: 150,
    minimumAgeYears: null,
    maximumAgeYears: null,
    genderDivision: "OPEN",
    participantQuota: null,
    rankingEnabled: true,
    certificateEnabled: true,
    priceAmountCents: 75_000,
    displayOrder: 1,
  },
  {
    name: "10K Challenge",
    slug: "10k-challenge",
    description: "Kategori menengah untuk peserta yang sudah terbiasa berlari jarak stabil.",
    distanceMeters: 10_000,
    distanceToleranceMeters: 250,
    minimumAgeYears: null,
    maximumAgeYears: null,
    genderDivision: "OPEN",
    participantQuota: null,
    rankingEnabled: true,
    certificateEnabled: true,
    priceAmountCents: 100_000,
    displayOrder: 2,
  },
  {
    name: "Half Marathon 21K",
    slug: "half-marathon-21k",
    description: "Kategori jarak jauh untuk peserta yang siap menyelesaikan tantangan 21K.",
    distanceMeters: 21_097,
    distanceToleranceMeters: 500,
    minimumAgeYears: null,
    maximumAgeYears: null,
    genderDivision: "OPEN",
    participantQuota: null,
    rankingEnabled: true,
    certificateEnabled: true,
    priceAmountCents: 150_000,
    displayOrder: 3,
  },
];

async function seedDevelopmentData() {
  await runMigrations();

  await withTransaction(async (client) => {
    const normalizedEmail = env.DEV_ADMIN_EMAIL.trim().toLowerCase();
    const passwordHash = await hashAdminPassword(env.DEV_ADMIN_PASSWORD);
    const admin = await upsertDevelopmentAdminUser(
      {
        normalizedEmail,
        displayEmail: env.DEV_ADMIN_EMAIL,
        fullName: "Development Super Admin",
        passwordHash,
      },
      client,
    );

    await ensureAdminRole(admin.id, "SUPER_ADMIN", client);

    const event = await upsertSeedEventBySlug(eventSlug, seedEvent, admin.id, client);

    for (const category of seedCategories) {
      await upsertSeedCategory(event.id, category, client);
    }

    logger.info("Development seed completed", {
      adminEmail: normalizedEmail,
      eventSlug,
    });
  });
}

seedDevelopmentData().catch((error: unknown) => {
  logger.error("Development seed failed", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  process.exitCode = 1;
});
