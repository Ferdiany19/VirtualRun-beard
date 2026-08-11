import Link from "next/link";
import { cookies } from "next/headers";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import {
  archiveBibTemplateAction,
  duplicateBibTemplateAction,
  publishBibTemplateAction,
  updateBibTemplateMetadataAction,
  updateBibTemplateSettingsAction,
  uploadBibTemplateDraftAction,
} from "@/app/admin/(protected)/bib-templates/actions";
import { BibTemplateLiveEditor } from "@/modules/bib/components/bib-template-live-editor";
import { BibTemplateEventSelector } from "@/modules/bib/components/bib-template-event-selector";
import { FormMessage } from "@/modules/events/components/form-message";
import { formatBusinessDateTime } from "@/shared/date/business-timezone";
import { Icon } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BibTemplateStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
type BibSettings = {
  bibPrefix: string;
  bibSuffix: string | null;
  sequenceStart: number;
  numericPadding: number;
  nextSequence: number;
  textColor: string;
  fontFamily: "Montserrat" | "Arial" | "Helvetica" | "Georgia" | "Times New Roman";
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  textAlignment: "LEFT" | "CENTER" | "RIGHT";
  numberAreaX: number;
  numberAreaY: number;
  numberAreaWidth: number;
  numberAreaHeight: number;
  showParticipantName: boolean;
  participantNameX: number;
  participantNameY: number;
  participantNameWidth: number;
  participantNameHeight: number;
  participantNameFontSize: number;
  showCategoryLabel: boolean;
  categoryLabelX: number;
  categoryLabelY: number;
  categoryLabelWidth: number;
  categoryLabelHeight: number;
  categoryLabelFontSize: number;
  templateCanvasWidth: number;
  templateCanvasHeight: number;
  activeTemplateVersionId: string | null;
};
type BibTemplateVersion = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  status: BibTemplateStatus;
  canvasWidth: number;
  canvasHeight: number;
  fileSizeBytes: number;
  versionNumber: number;
  isActive: boolean;
  uploadedByAdminName: string | null;
  createdAt: string;
  updatedAt: string;
};
type SampleParticipant = {
  registrationId: string;
  participantName: string;
  bibNumber: string;
  categories: Array<{ id: string; name: string }>;
};
type BibTemplateDetailData = {
  template: BibTemplateVersion;
  settings: BibSettings;
  templates: BibTemplateVersion[];
  event: { id: string; name: string; slug: string };
  manageableEvents: Array<{ id: string; name: string }>;
  sampleParticipants: SampleParticipant[];
};

type DetailPageProps = {
  params: Promise<{ templateVersionId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

const statusLabel: Record<BibTemplateStatus, string> = {
  ACTIVE: "Aktif",
  DRAFT: "Draft",
  ARCHIVED: "Arsip",
};

function apiUrl(pathname: string): string {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  return new URL(pathname, baseUrl).toString();
}

async function fetchDetail(templateVersionId: string): Promise<BibTemplateDetailData> {
  const response = await fetch(apiUrl(`/api/admin/bib-templates/${templateVersionId}`), {
    cache: "no-store",
    headers: { cookie: (await cookies()).toString() },
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat detail template BIB (${response.status}).`);
  }

  return (await response.json()) as BibTemplateDetailData;
}

function statusTone(status: BibTemplateStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "DRAFT") return "warning" as const;
  return "neutral" as const;
}

export default async function BibTemplateDetailPage({ params, searchParams }: DetailPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const { templateVersionId } = await params;
  const query = await searchParams;
  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const data = await fetchDetail(templateVersionId);
  const { event, settings, template } = data;
  const sample = data.sampleParticipants[0] ?? null;

  return (
    <div className="space-y-6">
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Link className="font-bold hover:text-primary" href="/admin/bib-templates">
              BIB Template
            </Link>
            <Icon className="h-4 w-4" name="chevron-right" />
            <span>Detail Template</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-navy">{template.name}</h1>
            <StatusBadge tone={statusTone(template.status)}>
              {statusLabel[template.status]}
            </StatusBadge>
          </div>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 text-sm font-bold text-navy hover:border-primary hover:text-primary"
          href="/admin/bib-templates"
        >
          <Icon className="h-4 w-4" name="chevron-left" />
          Kembali
        </Link>
      </div>

      <section className="rounded-section border border-border bg-surface shadow-soft">
        <div className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-center">
          <label className="grid max-w-sm flex-1 gap-1 text-sm font-bold text-navy">
            Pilih Event
            <BibTemplateEventSelector
              currentEventId={event.id}
              events={data.manageableEvents}
            />
          </label>
          <p className="text-sm text-foreground-muted">
            Template tetap tersimpan untuk event: <strong>{event.name}</strong>.
          </p>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[180px_minmax(0,1fr)_260px] lg:items-center">
          <div className="overflow-hidden rounded-app border border-border bg-surface-muted">
            <img
              alt={`Template ${template.name}`}
              className="aspect-[1.6/1] w-full object-cover"
              src={`/api/admin/bib/template-preview?templateVersionId=${template.id}`}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-navy">{template.name}</h2>
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-4">
              <div>
                <dt className="text-xs font-bold text-foreground-muted">Versi</dt>
                <dd className="mt-1 font-bold text-navy">{template.versionNumber}.0.0</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-foreground-muted">Event</dt>
                <dd className="mt-1 font-bold text-navy">{event.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-foreground-muted">Dibuat Oleh</dt>
                <dd className="mt-1 font-bold text-navy">
                  {template.uploadedByAdminName ?? "Sistem"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-foreground-muted">Terakhir Diperbarui</dt>
                <dd className="mt-1 font-bold text-navy">
                  {formatBusinessDateTime(new Date(template.updatedAt))} WIB
                </dd>
              </div>
            </dl>
          </div>
          <div className="grid gap-2">
            <form action={updateBibTemplateMetadataAction.bind(null, template.id)}>
              <input name="csrfToken" type="hidden" value={csrfToken} />
              <input name="name" type="hidden" value={template.name} />
              <input name="description" type="hidden" value={template.description ?? ""} />
              <button
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app border border-border px-4 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                type="submit"
              >
                <Icon className="h-4 w-4" name="document" />
                Simpan Draft
              </button>
            </form>
            <form action={publishBibTemplateAction.bind(null, template.id)}>
              <input name="csrfToken" type="hidden" value={csrfToken} />
              <input
                data-bib-template-event-id
                name="eventId"
                type="hidden"
                value={event.id}
              />
              <button
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app bg-action px-4 text-sm font-bold text-white hover:bg-action-hover"
                type="submit"
              >
                <Icon className="h-4 w-4" name="upload" />
                Publikasikan
              </button>
            </form>
            <form action={duplicateBibTemplateAction.bind(null, template.id)}>
              <input name="csrfToken" type="hidden" value={csrfToken} />
              <button
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app border border-border px-4 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                type="submit"
              >
                <Icon className="h-4 w-4" name="clipboard" />
                Duplikat Template
              </button>
            </form>
          </div>
        </div>
      </section>

      <BibTemplateLiveEditor
        csrfToken={csrfToken}
        sample={sample}
        settings={settings}
        settingsAction={updateBibTemplateSettingsAction.bind(null, template.id, event.id)}
        template={template}
        uploadAction={uploadBibTemplateDraftAction.bind(null, event.id)}
      />

      <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
        <h2 className="text-base font-bold text-navy">Metadata Template</h2>
        <form
          action={updateBibTemplateMetadataAction.bind(null, template.id)}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <input name="csrfToken" type="hidden" value={csrfToken} />
          <label className="grid gap-1 text-xs font-bold text-navy">
            Nama Template
            <input
              className="min-h-10 rounded-app border border-border px-3 text-sm font-bold text-navy"
              defaultValue={template.name}
              name="name"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-navy">
            Status
            <input
              className="min-h-10 rounded-app border border-border bg-surface-muted px-3 text-sm font-bold text-navy"
              readOnly
              value={statusLabel[template.status]}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-navy md:col-span-2">
            Deskripsi
            <textarea
              className="min-h-24 rounded-app border border-border px-3 py-2 text-sm text-navy"
              defaultValue={template.description ?? ""}
              maxLength={500}
              name="description"
            />
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-app border border-primary px-4 text-sm font-bold text-primary hover:bg-teal-50"
            type="submit"
          >
            Simpan Metadata
          </button>
        </form>
      </article>

      <div className="flex flex-col gap-3 border-t border-border pt-5 lg:flex-row lg:items-center lg:justify-between">
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 text-sm font-bold text-navy hover:border-primary hover:text-primary"
          href="/admin/bib-templates"
        >
          <Icon className="h-4 w-4" name="chevron-left" />
          Kembali ke Daftar Template
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 text-sm font-bold text-navy hover:border-primary hover:text-primary"
            form="bib-template-settings-form"
            type="submit"
          >
            <Icon className="h-4 w-4" name="document" />
            Simpan Draft
          </button>
          <form action={publishBibTemplateAction.bind(null, template.id)}>
            <input name="csrfToken" type="hidden" value={csrfToken} />
            <input
              data-bib-template-event-id
              name="eventId"
              type="hidden"
              value={event.id}
            />
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app bg-action px-5 text-sm font-bold text-white hover:bg-action-hover"
              type="submit"
            >
              <Icon className="h-4 w-4" name="upload" />
              Publikasikan Template
            </button>
          </form>
          <form action={archiveBibTemplateAction.bind(null, template.id)}>
            <input name="csrfToken" type="hidden" value={csrfToken} />
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app border border-border px-4 text-sm font-bold text-navy hover:border-danger hover:text-danger"
              type="submit"
            >
              Arsipkan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
