import Image from "next/image";
import Link from "next/link";
import { formatDateTimeRange } from "@/modules/events/components/event-display";
import type { EventRecord } from "@/modules/events/event.types";
import { activityPlatformLabels } from "@/modules/submissions/submission.schema";
import { formatDistanceMeter } from "@/modules/submissions/submission.service";
import {
  submissionStatusLabel,
  submissionStatusTone,
} from "@/modules/submissions/components/submission-views";
import type { SubmissionDetail } from "@/modules/submissions/submission.types";
import {
  rejectionReasonCodes,
  revisionRequestReasonCodes,
} from "@/modules/validation/validation.schema";
import type {
  EligibleValidator,
  EventValidatorAssignmentRecord,
  ValidationQueueItem,
  ValidationReviewRecord,
  ValidationWarning,
} from "@/modules/validation/validation.types";
import { formatBusinessDateTime } from "@/shared/date/business-timezone";
import { StatusBadge } from "@/shared/ui/status-badge";

type Action = (formData: FormData) => Promise<void>;

function warningTone(tone: ValidationWarning["tone"]) {
  if (tone === "danger") {
    return "danger" as const;
  }
  if (tone === "warning") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function canShowDecisionForms(detail: SubmissionDetail): boolean {
  const status = detail.submission?.status;
  return Boolean(detail.currentRevision && (status === "SUBMITTED" || status === "UNDER_REVIEW"));
}

export function ValidationQueueView({
  items,
  query,
  event,
}: {
  items: ValidationQueueItem[];
  query: Record<string, string | undefined>;
  event?: EventRecord;
}) {
  return (
    <div className="space-y-6">
      {event ? (
        <section className="rounded-section border border-border bg-surface p-4 shadow-soft">
          <p className="eyebrow">Periode Event</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <p className="text-sm font-bold text-navy">
              Aktivitas: {formatDateTimeRange(event.activityStartsAt, event.activityEndsAt)}
            </p>
            <p className="text-sm font-bold text-navy">
              Upload: {formatDateTimeRange(event.uploadStartsAt, event.uploadEndsAt)}
            </p>
          </div>
        </section>
      ) : null}
      <form className="grid gap-3 rounded-section border border-border bg-surface p-4 shadow-soft md:grid-cols-6">
        <input
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          defaultValue={query.search ?? ""}
          name="search"
          placeholder="Cari nama atau BIB"
        />
        {!event ? (
          <input
            className="min-h-11 rounded-app border border-border px-3 text-sm"
            defaultValue={query.eventId ?? ""}
            name="eventId"
            placeholder="Event ID"
          />
        ) : null}
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          defaultValue={query.status ?? ""}
          name="status"
        >
          <option value="">Queue aktif</option>
          <option value="SUBMITTED">Sudah dikirim</option>
          <option value="UNDER_REVIEW">Sedang ditinjau</option>
          <option value="REVISION_REQUIRED">Perlu perbaikan</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
          <option value="DISQUALIFIED">Didiskualifikasi</option>
        </select>
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          defaultValue={query.distanceCheck ?? ""}
          name="distanceCheck"
        >
          <option value="">Semua jarak</option>
          <option value="inside">Dalam toleransi</option>
          <option value="outside">Di luar toleransi</option>
        </select>
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          defaultValue={query.evidenceType ?? ""}
          name="evidenceType"
        >
          <option value="">Semua bukti</option>
          <option value="URL">URL saja</option>
          <option value="SCREENSHOT">Screenshot saja</option>
          <option value="BOTH">URL + screenshot</option>
        </select>
        <button className="min-h-11 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white">
          Filter
        </button>
      </form>

      <section className="overflow-hidden rounded-section border border-border bg-surface shadow-soft">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-foreground-muted">
              <tr>
                <th className="px-4 py-3">BIB</th>
                <th className="px-4 py-3">Peserta</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Hasil</th>
                <th className="px-4 py-3">Bukti</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.submissionId}>
                  <td className="px-4 py-3 font-bold text-navy">{item.bibNumber}</td>
                  <td className="px-4 py-3">
                    {item.participantName}
                    <span className="block text-xs text-foreground-muted">{item.eventName}</span>
                  </td>
                  <td className="px-4 py-3">
                    {item.categoryName}
                    <span className="block text-xs text-foreground-muted">
                      Target {formatDistanceMeter(item.targetDistanceMeter)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {formatDistanceMeter(item.actualDistanceMeter)}
                    <span className="block text-xs text-foreground-muted">
                      Aktivitas: {item.activityDate}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-navy">
                      {item.hasActivityUrl ? "URL" : ""}
                      {item.hasActivityUrl && item.hasScreenshot ? " + " : ""}
                      {item.hasScreenshot ? "Screenshot" : ""}
                    </span>
                    <span className="block text-xs text-foreground-muted">
                      {activityPlatformLabels[item.activityPlatform]} - {item.warningCount} warning
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={submissionStatusTone(item.status)}>
                      {submissionStatusLabel(item.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="font-bold text-primary"
                      href={`/admin/events/${item.eventId}/submissions/${item.submissionId}`}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-3 lg:hidden">
          {items.map((item) => (
            <Link
              key={item.submissionId}
              className="rounded-app border border-border p-4"
              href={`/admin/events/${item.eventId}/submissions/${item.submissionId}`}
            >
              <p className="font-bold text-navy">
                {item.bibNumber} - {item.participantName}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                {item.categoryName} - {formatDistanceMeter(item.actualDistanceMeter)}
              </p>
              <p className="mt-2 text-xs font-bold text-primary">
                {submissionStatusLabel(item.status)} - {item.warningCount} warning
              </p>
            </Link>
          ))}
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-sm text-foreground-muted">Queue validation masih kosong.</div>
        ) : null}
      </section>
    </div>
  );
}

function HiddenReviewFields({ detail }: { detail: SubmissionDetail }) {
  return (
    <>
      <input name="submissionId" type="hidden" value={detail.submission?.id ?? ""} />
      <input name="revisionId" type="hidden" value={detail.currentRevision?.id ?? ""} />
      <input
        name="expectedReviewVersion"
        type="hidden"
        value={detail.submission?.reviewVersion ?? 0}
      />
    </>
  );
}

function DecisionForm({
  title,
  actionName,
  action,
  csrfToken,
  reasonCodes,
  needsParticipantNote,
  needsInternalNote,
  detail,
}: {
  title: string;
  actionName: string;
  action: Action;
  csrfToken: string;
  reasonCodes?: readonly string[];
  needsParticipantNote?: boolean;
  needsInternalNote?: boolean;
  detail: SubmissionDetail;
}) {
  return (
    <form action={action} className="grid gap-3 rounded-app border border-border p-4">
      <input name="csrfToken" type="hidden" value={csrfToken} />
      <HiddenReviewFields detail={detail} />
      <input name="action" type="hidden" value={actionName} />
      <p className="font-bold text-navy">{title}</p>
      {reasonCodes ? (
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          name="reasonCode"
          required
        >
          <option value="">Pilih alasan</option>
          {reasonCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      ) : null}
      <textarea
        className="min-h-24 rounded-app border border-border px-3 py-2 text-sm"
        name="participantVisibleNote"
        placeholder="Catatan untuk peserta"
        required={needsParticipantNote}
      />
      <textarea
        className="min-h-24 rounded-app border border-border px-3 py-2 text-sm"
        name="internalNote"
        placeholder="Catatan internal admin"
        required={needsInternalNote}
      />
      <button className="min-h-11 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white">
        Simpan {title}
      </button>
    </form>
  );
}

function ReviewHistory({ reviews }: { reviews: ValidationReviewRecord[] }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-bold text-navy">Riwayat validation</h2>
      {reviews.map((review) => (
        <article key={review.id} className="rounded-app border border-border bg-surface p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-bold text-navy">{review.action}</p>
              <p className="small-copy mt-1">
                {review.reviewerName ?? "System"} - {formatBusinessDateTime(review.reviewedAt)} WIB
              </p>
            </div>
            <StatusBadge tone={submissionStatusTone(review.resultingStatus)}>
              {submissionStatusLabel(review.resultingStatus)}
            </StatusBadge>
          </div>
          {review.reasonCode ? (
            <p className="small-copy mt-3">Alasan: {review.reasonCode}</p>
          ) : null}
          {review.participantVisibleNote ? (
            <p className="body-copy mt-3">Untuk peserta: {review.participantVisibleNote}</p>
          ) : null}
          {review.internalNote ? (
            <p className="mt-3 rounded-app bg-surface-muted p-3 text-sm text-navy">
              Internal: {review.internalNote}
            </p>
          ) : null}
        </article>
      ))}
      {reviews.length === 0 ? <p className="small-copy">Belum ada riwayat validation.</p> : null}
    </section>
  );
}

export function ValidationDetailView({
  detail,
  csrfToken,
  decisionAction,
}: {
  detail: SubmissionDetail;
  csrfToken: string;
  decisionAction: Action;
}) {
  const current = detail.currentRevision;
  const file = detail.currentFile;
  const canAct = canShowDecisionForms(detail);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Review submission</p>
              <h1 className="mt-2 text-2xl font-bold text-navy">{detail.participant.fullName}</h1>
              <p className="small-copy mt-1">
                BIB {detail.registration.bibNumber} - {detail.category.name}
              </p>
            </div>
            <StatusBadge tone={submissionStatusTone(detail.submission?.status ?? null)}>
              {submissionStatusLabel(detail.submission?.status ?? null)}
            </StatusBadge>
          </div>

          {current ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-4">
              <Info label="Jarak" value={formatDistanceMeter(current.distanceMeter)} />
              <Info label="Revisi" value={`${current.revisionNumber}`} />
            </dl>
          ) : null}

          {file ? (
            <div className="mt-6">
              <Image
                alt="Screenshot bukti aktivitas"
                className="w-full rounded-app border border-border"
                height={file.height}
                src={`/api/admin/submission-file/download?fileId=${file.id}&mode=preview`}
                width={file.width}
              />
              <a
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-app border border-border px-4 py-2 text-sm font-bold text-navy"
                href={`/api/admin/submission-file/download?fileId=${file.id}`}
              >
                Unduh bukti
              </a>
            </div>
          ) : (
            <p className="body-copy mt-5">Tidak ada screenshot pada revisi terbaru.</p>
          )}

          {current?.activityUrl ? (
            <a
              className="mt-5 block break-all font-bold text-primary"
              href={current.activityUrl}
              rel="noreferrer"
              target="_blank"
            >
              Buka URL aktivitas
            </a>
          ) : null}
        </article>

        <aside className="space-y-4">
          {canAct ? (
            <section className="grid gap-4 rounded-section border border-border bg-surface p-5 shadow-soft">
              <p className="eyebrow">Keputusan admin</p>
              <DecisionForm
                action={decisionAction}
                actionName="APPROVE"
                csrfToken={csrfToken}
                detail={detail}
                title="Approve"
              />
              <DecisionForm
                action={decisionAction}
                actionName="REQUEST_REVISION"
                csrfToken={csrfToken}
                detail={detail}
                needsParticipantNote
                reasonCodes={revisionRequestReasonCodes}
                title="Request Revision"
              />
              <DecisionForm
                action={decisionAction}
                actionName="REJECT"
                csrfToken={csrfToken}
                detail={detail}
                needsParticipantNote
                reasonCodes={rejectionReasonCodes}
                title="Reject"
              />
            </section>
          ) : (
            <section className="rounded-section border border-border bg-surface p-5 shadow-soft">
              <p className="font-bold text-navy">Keputusan sudah terkunci</p>
              <p className="small-copy mt-2">
                Submission ini belum memiliki revisi aktif yang bisa diputuskan atau statusnya
                sudah final.
              </p>
            </section>
          )}
        </aside>
      </section>

      <section className="grid gap-3 rounded-section border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-xl font-bold text-navy">Deterministic checks</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {detail.warnings.map((warning) => (
            <div key={warning.code} className="rounded-app border border-border p-4">
              <StatusBadge tone={warningTone(warning.tone)}>{warning.label}</StatusBadge>
              <p className="small-copy mt-2">{warning.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-bold text-navy">Riwayat revisi</h2>
        {detail.revisions.map((revision) => (
          <article key={revision.id} className="rounded-app border border-border bg-surface p-4">
            <p className="font-bold text-navy">Revisi {revision.revisionNumber}</p>
            <p className="small-copy mt-1">
              {formatDistanceMeter(revision.distanceMeter)} -{" "}
              {formatBusinessDateTime(revision.submittedAt)} WIB
            </p>
          </article>
        ))}
      </section>

      <ReviewHistory reviews={detail.validationReviews} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-app border border-border bg-surface-muted p-3">
      <dt className="caption-copy font-bold">{label}</dt>
      <dd className="mt-1 font-bold text-navy">{value}</dd>
    </div>
  );
}

export function ValidatorAssignmentView({
  assignments,
  eligibleValidators,
  csrfToken,
  assignAction,
  revokeAction,
}: {
  assignments: EventValidatorAssignmentRecord[];
  eligibleValidators: EligibleValidator[];
  csrfToken: string;
  assignAction: Action;
  revokeAction: Action;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-section border border-border bg-surface shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-foreground-muted">
              <tr>
                <th className="px-4 py-3">Validator</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Revoke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignments.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-navy">{item.adminFullName}</p>
                    <p className="text-xs text-foreground-muted">{item.adminDisplayEmail}</p>
                  </td>
                  <td className="px-4 py-3">{formatBusinessDateTime(item.assignedAt)} WIB</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={item.revokedAt ? "neutral" : "success"}>
                      {item.revokedAt ? "Revoked" : "Aktif"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {!item.revokedAt ? (
                      <form action={revokeAction} className="flex gap-2">
                        <input name="csrfToken" type="hidden" value={csrfToken} />
                        <input name="assignmentId" type="hidden" value={item.id} />
                        <input
                          className="min-h-11 rounded-app border border-border px-3 text-sm"
                          name="reason"
                          placeholder="Alasan revoke"
                          required
                        />
                        <button className="min-h-11 rounded-app border border-red-200 px-3 text-sm font-bold text-danger">
                          Revoke
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-foreground-muted">{item.revokeReason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {assignments.map((item) => (
            <article key={item.id} className="rounded-app border border-border p-4">
              <p className="font-bold text-navy">{item.adminFullName}</p>
              <p className="small-copy mt-1">{item.adminDisplayEmail}</p>
            </article>
          ))}
        </div>
      </section>
      <aside className="rounded-section border border-border bg-surface p-5 shadow-soft">
        <p className="eyebrow">Assign validator</p>
        <form action={assignAction} className="mt-4 grid gap-3">
          <input name="csrfToken" type="hidden" value={csrfToken} />
          <select
            className="min-h-11 rounded-app border border-border px-3 text-sm"
            name="adminUserId"
            required
          >
            <option value="">Pilih validator</option>
            {eligibleValidators.map((validator) => (
              <option key={validator.id} value={validator.id}>
                {validator.fullName} - {validator.displayEmail}
              </option>
            ))}
          </select>
          <button className="min-h-11 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white">
            Assign
          </button>
        </form>
      </aside>
    </div>
  );
}
