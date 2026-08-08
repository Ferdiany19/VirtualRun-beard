import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { getPublicEventBySlug } from "@/modules/events/event.service";
import { formatBusinessDateTime } from "@/shared/date/business-timezone";
import {
  RegistrationClosedView,
  RegistrationFormView,
} from "@/modules/registrations/components/registration-views";
import { countActiveEventRegistrations } from "@/modules/registrations/registration.repository";
import { submitRegistrationAction } from "@/app/(public)/events/[slug]/register/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegisterPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { slug } = await params;
  const data = await getPublicEventBySlug(slug).catch(() => null);

  if (!data) {
    notFound();
  }

  const activeCategories = data.categories.filter((category) => category.isActive);
  const now = new Date();

  if (data.event.registrationStartsAt > now) {
    return (
      <RegistrationClosedView
        description={`Pendaftaran dibuka pada ${formatBusinessDateTime(data.event.registrationStartsAt)} WIB.`}
        event={data.event}
        title="Pendaftaran belum dibuka"
      />
    );
  }

  if (data.event.registrationEndsAt < now) {
    return (
      <RegistrationClosedView
        description="Periode pendaftaran event ini telah berakhir."
        event={data.event}
        title="Pendaftaran telah berakhir"
      />
    );
  }

  if (activeCategories.length < 1) {
    return (
      <RegistrationClosedView
        description="Kategori aktif belum tersedia untuk event ini."
        event={data.event}
        title="Pendaftaran belum tersedia"
      />
    );
  }

  if (data.event.maximumParticipants !== null) {
    const registeredCount = await countActiveEventRegistrations(data.event.id);

    if (registeredCount >= data.event.maximumParticipants) {
      return (
        <RegistrationClosedView
          description="Kuota peserta event ini sudah penuh."
          event={data.event}
          title="Kuota penuh"
        />
      );
    }
  }

  return (
    <RegistrationFormView
      action={submitRegistrationAction.bind(null, data.event.slug)}
      categories={activeCategories}
      event={data.event}
      idempotencyKey={randomUUID()}
    />
  );
}
