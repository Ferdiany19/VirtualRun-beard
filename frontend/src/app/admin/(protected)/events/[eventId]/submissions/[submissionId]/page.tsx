import { saveValidationDecisionAction } from "@/app/admin/(protected)/events/[eventId]/submissions/[submissionId]/actions";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { getManagedSubmissionCertificateSummary } from "@/modules/certificates/certificate.service";
import type { SubmissionCertificateSummary } from "@/modules/certificates/certificate.types";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { ValidationDetailView } from "@/modules/validation/components/validation-views";
import {
  getValidationEvent,
  getValidationSubmissionDetail,
} from "@/modules/validation/validation.service";
import { formatBusinessDateTime } from "@/shared/date/business-timezone";
import { StatusBadge } from "@/shared/ui/status-badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminSubmissionDetailPageProps = {
  params: Promise<{ eventId: string; submissionId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

function certificateStatusLabel(status: SubmissionCertificateSummary["status"]): string {
  const labels: Record<SubmissionCertificateSummary["status"], string> = {
    NOT_ELIGIBLE: "Belum eligible",
    CONFIGURATION_INCOMPLETE: "Konfigurasi belum lengkap",
    WAITING_EVENT_COMPLETION: "Menunggu event selesai",
    QUEUED: "Dalam antrean",
    SENT: "Terkirim",
    FAILED: "Gagal",
    INVALIDATED: "Invalidated",
  };
  return labels[status];
}

function certificateStatusTone(status: SubmissionCertificateSummary["status"]) {
  if (status === "SENT") {
    return "success" as const;
  }
  if (status === "FAILED" || status === "INVALIDATED") {
    return "danger" as const;
  }
  if (status === "CONFIGURATION_INCOMPLETE" || status === "WAITING_EVENT_COMPLETION") {
    return "warning" as const;
  }
  return "neutral" as const;
}

export default async function AdminSubmissionDetailPage({
  params,
  searchParams,
}: AdminSubmissionDetailPageProps) {
  const admin = await requireAdminSession();
  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const { eventId, submissionId } = await params;
  const query = await searchParams;
  const event = await getValidationEvent({ eventId, admin });
  const detail = await getValidationSubmissionDetail({ submissionId, admin });
  const certificateSummary = await getManagedSubmissionCertificateSummary({ submissionId, admin });
  const decisionAction = saveValidationDecisionAction.bind(null, event.id, submissionId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actionHref={`/admin/events/${event.id}/submissions`}
        actionLabel="Kembali"
        description="Review bukti peserta, lalu simpan approve, request revisi, atau reject."
        eyebrow="Validation Detail"
        title={`${event.name} - ${detail.participant.fullName}`}
      />
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <section className="rounded-section border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Sertifikat</p>
            <p className="mt-1 text-sm text-foreground-muted">
              {certificateSummary.certificateNumber
                ? `Nomor ${certificateSummary.certificateNumber}`
                : "Status sertifikat untuk submission ini."}
            </p>
            {certificateSummary.emailedAt ? (
              <p className="mt-1 text-xs text-foreground-muted">
                Terkirim {formatBusinessDateTime(certificateSummary.emailedAt)} WIB
              </p>
            ) : null}
          </div>
          <StatusBadge tone={certificateStatusTone(certificateSummary.status)}>
            {certificateStatusLabel(certificateSummary.status)}
          </StatusBadge>
        </div>
      </section>
      <ValidationDetailView
        csrfToken={csrfToken}
        decisionAction={decisionAction}
        detail={detail}
      />
    </div>
  );
}
