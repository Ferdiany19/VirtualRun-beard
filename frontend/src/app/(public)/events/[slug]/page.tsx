import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { getPublicEventBySlug } from "@/modules/events/event.service";
import { EventLandingPage } from "@/modules/events/components/event-landing-page";
import { countActiveEventRegistrations } from "@/modules/registrations/registration.repository";
import { submitEventDetailRegistrationAction } from "@/app/(public)/events/[slug]/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublicEventPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; message?: string; success?: string }>;
};

export default async function PublicEventPage({ params, searchParams }: PublicEventPageProps) {
  const { slug } = await params;
  const feedback = await searchParams;
  const eventWithCategories = await getPublicEventBySlug(slug).catch(() => null);

  if (!eventWithCategories) {
    notFound();
  }

  const activeCategories = eventWithCategories.categories.filter((category) => category.isActive);
  const now = new Date();
  const isInsideRegistrationWindow =
    eventWithCategories.event.registrationStartsAt <= now &&
    eventWithCategories.event.registrationEndsAt >= now;
  const registeredCount =
    isInsideRegistrationWindow && eventWithCategories.event.maximumParticipants !== null
      ? await countActiveEventRegistrations(eventWithCategories.event.id)
      : 0;
  const registrationAvailable =
    isInsideRegistrationWindow &&
    activeCategories.length > 0 &&
    (eventWithCategories.event.maximumParticipants === null ||
      registeredCount < eventWithCategories.event.maximumParticipants);

  return (
    <EventLandingPage
      action={submitEventDetailRegistrationAction.bind(null, eventWithCategories.event.slug)}
      categories={eventWithCategories.categories}
      event={eventWithCategories.event}
      idempotencyKey={randomUUID()}
      registrationError={feedback.error}
      registrationErrorMessage={feedback.message}
      registrationAvailable={registrationAvailable}
    />
  );
}
