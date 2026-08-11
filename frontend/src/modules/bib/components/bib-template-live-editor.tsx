"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

type ServerFormAction = (formData: FormData) => void | Promise<void>;

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
};

type BibTemplate = {
  id: string;
  name: string;
  versionNumber: number;
  canvasWidth: number;
  canvasHeight: number;
};

type SampleParticipant = {
  participantName: string;
  bibNumber: string;
  categories: Array<{ id: string; name: string }>;
};

type LiveEditorProps = {
  csrfToken: string;
  sample: SampleParticipant | null;
  settings: BibSettings;
  settingsAction: ServerFormAction;
  template: BibTemplate;
  uploadAction: ServerFormAction;
};

const fontFamilies = ["Montserrat", "Arial", "Helvetica", "Georgia", "Times New Roman"] as const;
const fontSizes = [24, 28, 32, 36, 42, 48, 56, 64, 72, 84, 96, 108, 120, 144, 168, 192] as const;
const fontWeights = [400, 500, 600, 700, 800] as const;

function toNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function px(value: number, base: number) {
  return `${(value / base) * 100}%`;
}

function readPreview(form: HTMLFormElement, current: BibSettings): BibSettings {
  const formData = new FormData(form);

  return {
    ...current,
    bibPrefix: String(formData.get("bibPrefix") ?? current.bibPrefix),
    bibSuffix: String(formData.get("bibSuffix") ?? current.bibSuffix ?? ""),
    sequenceStart: toNumber(formData.get("sequenceStart"), current.sequenceStart),
    numericPadding: toNumber(formData.get("numericPadding"), current.numericPadding),
    nextSequence: toNumber(formData.get("nextSequence"), current.nextSequence),
    textColor: String(formData.get("textColor") ?? current.textColor),
    fontFamily: String(
      formData.get("fontFamily") ?? current.fontFamily,
    ) as BibSettings["fontFamily"],
    fontSize: toNumber(formData.get("fontSize"), current.fontSize),
    fontWeight: toNumber(
      formData.get("fontWeight"),
      current.fontWeight,
    ) as BibSettings["fontWeight"],
    textAlignment: String(
      formData.get("textAlignment") ?? current.textAlignment,
    ) as BibSettings["textAlignment"],
    numberAreaX: toNumber(formData.get("numberAreaX"), current.numberAreaX),
    numberAreaY: toNumber(formData.get("numberAreaY"), current.numberAreaY),
    numberAreaWidth: toNumber(formData.get("numberAreaWidth"), current.numberAreaWidth),
    numberAreaHeight: toNumber(formData.get("numberAreaHeight"), current.numberAreaHeight),
    showParticipantName: formData.get("showParticipantName") === "on",
    participantNameX: toNumber(formData.get("participantNameX"), current.participantNameX),
    participantNameY: toNumber(formData.get("participantNameY"), current.participantNameY),
    participantNameWidth: toNumber(
      formData.get("participantNameWidth"),
      current.participantNameWidth,
    ),
    participantNameHeight: toNumber(
      formData.get("participantNameHeight"),
      current.participantNameHeight,
    ),
    participantNameFontSize: toNumber(
      formData.get("participantNameFontSize"),
      current.participantNameFontSize,
    ),
    showCategoryLabel: formData.get("showCategoryLabel") === "on",
    categoryLabelX: toNumber(formData.get("categoryLabelX"), current.categoryLabelX),
    categoryLabelY: toNumber(formData.get("categoryLabelY"), current.categoryLabelY),
    categoryLabelWidth: toNumber(formData.get("categoryLabelWidth"), current.categoryLabelWidth),
    categoryLabelHeight: toNumber(formData.get("categoryLabelHeight"), current.categoryLabelHeight),
    categoryLabelFontSize: toNumber(
      formData.get("categoryLabelFontSize"),
      current.categoryLabelFontSize,
    ),
    templateCanvasWidth: toNumber(formData.get("templateCanvasWidth"), current.templateCanvasWidth),
    templateCanvasHeight: toNumber(
      formData.get("templateCanvasHeight"),
      current.templateCanvasHeight,
    ),
  };
}

const publishSettingNames = [
  "bibPrefix",
  "bibSuffix",
  "sequenceStart",
  "numericPadding",
  "nextSequence",
  "textColor",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "textAlignment",
  "numberAreaX",
  "numberAreaY",
  "numberAreaWidth",
  "numberAreaHeight",
  "showParticipantName",
  "participantNameX",
  "participantNameY",
  "participantNameWidth",
  "participantNameHeight",
  "participantNameFontSize",
  "showCategoryLabel",
  "categoryLabelX",
  "categoryLabelY",
  "categoryLabelWidth",
  "categoryLabelHeight",
  "categoryLabelFontSize",
  "templateCanvasWidth",
  "templateCanvasHeight",
] as const;

function syncPublishSettings(form: HTMLFormElement) {
  const formData = new FormData(form);

  document
    .querySelectorAll<HTMLInputElement>("[data-bib-template-publish-setting]")
    .forEach((input) => {
      const name = input.dataset.bibTemplatePublishSetting;

      if (!name || !(publishSettingNames as readonly string[]).includes(name)) {
        return;
      }

      input.value = String(formData.get(name) ?? "");
    });
}

function ControlInput({
  label,
  name,
  value,
  max,
  min = 0,
}: {
  label: string;
  name: string;
  value: number;
  max?: number;
  min?: number;
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-navy">
      {label}
      <input
        className="min-h-10 rounded-app border border-border bg-background px-3 text-sm font-bold text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        defaultValue={value}
        max={max}
        min={min}
        name={name}
        type="number"
      />
    </label>
  );
}

function PreviewCanvas({
  sample,
  settings,
  template,
  compact = false,
}: {
  sample: SampleParticipant | null;
  settings: BibSettings;
  template: BibTemplate;
  compact?: boolean;
}) {
  const categoryLabel =
    sample?.categories.map((category) => category.name).join(" - ") || "5K";
  const bibNumber =
    sample?.bibNumber ??
    `${settings.bibPrefix}${String(settings.nextSequence).padStart(settings.numericPadding, "0")}${settings.bibSuffix ?? ""}`;

  return (
    <article
      className={
        compact
          ? "w-full"
          : "rounded-section border border-border bg-surface p-5 shadow-soft"
      }
    >
      {!compact ? (
        <>
          <h2 className="text-lg font-bold text-navy">Preview BIB</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Preview ini berubah langsung saat field pengaturan diubah.
          </p>
        </>
      ) : null}
      <div
        className={
          compact
            ? "overflow-hidden rounded-app bg-surface-muted"
            : "mt-5 overflow-hidden rounded-section border border-border bg-surface-muted p-3"
        }
      >
        <div
          className="relative mx-auto overflow-hidden rounded-app bg-white"
          style={{
            aspectRatio: `${settings.templateCanvasWidth} / ${settings.templateCanvasHeight}`,
          }}
        >
          <img
            alt={`Preview ${template.name}`}
            className="absolute inset-0 h-full w-full object-fill"
            src={`/api/admin/bib/template-preview?templateVersionId=${template.id}`}
          />
          <span
            className="absolute grid place-items-center px-2 font-bold"
            style={{
              color: settings.textColor,
              fontFamily: settings.fontFamily,
              fontSize: px(settings.fontSize, settings.templateCanvasHeight),
              fontWeight: settings.fontWeight,
              height: px(settings.numberAreaHeight, settings.templateCanvasHeight),
              left: px(settings.numberAreaX, settings.templateCanvasWidth),
              textAlign: settings.textAlignment.toLowerCase() as "left" | "center" | "right",
              top: px(settings.numberAreaY, settings.templateCanvasHeight),
              width: px(settings.numberAreaWidth, settings.templateCanvasWidth),
            }}
          >
            {bibNumber}
          </span>
          {settings.showParticipantName ? (
            <span
              className="absolute grid place-items-center px-2 text-center font-bold"
              style={{
                color: settings.textColor,
                fontFamily: settings.fontFamily,
                fontSize: px(settings.participantNameFontSize, settings.templateCanvasHeight),
                height: px(settings.participantNameHeight, settings.templateCanvasHeight),
                left: px(settings.participantNameX, settings.templateCanvasWidth),
                top: px(settings.participantNameY, settings.templateCanvasHeight),
                width: px(settings.participantNameWidth, settings.templateCanvasWidth),
              }}
            >
              {sample?.participantName ?? "Nama Peserta"}
            </span>
          ) : null}
          {settings.showCategoryLabel ? (
            <span
              className="absolute grid place-items-center px-2 text-center font-bold"
              style={{
                color: settings.textColor,
                fontFamily: settings.fontFamily,
                fontSize: px(settings.categoryLabelFontSize, settings.templateCanvasHeight),
                height: px(settings.categoryLabelHeight, settings.templateCanvasHeight),
                left: px(settings.categoryLabelX, settings.templateCanvasWidth),
                top: px(settings.categoryLabelY, settings.templateCanvasHeight),
                width: px(settings.categoryLabelWidth, settings.templateCanvasWidth),
              }}
            >
              {categoryLabel}
            </span>
          ) : null}
        </div>
      </div>
      {!compact ? (
        <div className="mt-4 grid gap-2">
          <p className="text-xs font-bold text-navy">Sample Peserta</p>
          {sample ? (
            <div className="flex items-center justify-between gap-3 rounded-app border border-border p-3">
              <span className="text-sm font-bold text-navy">{sample.participantName}</span>
              <span className="text-xs font-bold text-primary">{sample.bibNumber}</span>
            </div>
          ) : (
            <p className="rounded-app border border-dashed border-border p-4 text-sm text-foreground-muted">
              Event ini belum punya peserta aktif. Preview memakai nomor berikutnya dari pengaturan
              BIB.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function BibTemplatePreview({
  compact,
  sample,
  settings,
  template,
}: {
  compact?: boolean;
  sample: SampleParticipant | null;
  settings: BibSettings;
  template: BibTemplate;
}) {
  const [currentSettings, setCurrentSettings] = useState(settings);

  useEffect(() => {
    function handlePreviewUpdate(event: Event) {
      setCurrentSettings((event as CustomEvent<BibSettings>).detail);
    }

    window.addEventListener("bib-template-preview-update", handlePreviewUpdate);
    return () => window.removeEventListener("bib-template-preview-update", handlePreviewUpdate);
  }, []);

  return (
    <PreviewCanvas
      compact={compact}
      sample={sample}
      settings={currentSettings}
      template={template}
    />
  );
}

export function BibTemplateLiveEditor({
  csrfToken,
  sample,
  settings,
  settingsAction,
  template,
  uploadAction,
}: LiveEditorProps) {
  const [preview, setPreview] = useState<BibSettings>(settings);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const orientation =
    template.canvasWidth >= template.canvasHeight
      ? "Landscape (Horizontal)"
      : "Portrait (Vertikal)";
  const recommendedPrint =
    template.canvasWidth >= template.canvasHeight ? "12.4 cm x 7.6 cm" : "7.6 cm x 12.4 cm";
  const nextBib = useMemo(
    () =>
      `${preview.bibPrefix}${String(preview.nextSequence).padStart(preview.numericPadding, "0")}${preview.bibSuffix ?? ""}`,
    [preview.bibPrefix, preview.bibSuffix, preview.nextSequence, preview.numericPadding],
  );

  function updateFromForm(form: HTMLFormElement) {
    setPreview((current) => {
      const next = readPreview(form, current);
      window.dispatchEvent(
        new CustomEvent<BibSettings>("bib-template-preview-update", { detail: next }),
      );
      return next;
    });
    syncPublishSettings(form);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
      <div className="grid gap-5">
        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-bold text-navy">1 Upload Template Gambar</h2>
          <form action={uploadAction} className="mt-4 grid gap-4">
            <input name="csrfToken" type="hidden" value={csrfToken} />
            <input
              name="name"
              type="hidden"
              value={`${template.name} v${template.versionNumber + 1}`}
            />
            <label className="grid min-h-24 cursor-pointer place-items-center rounded-app border border-dashed border-border bg-background p-4 text-center text-sm text-navy hover:border-primary">
              <span>
                <Icon className="mx-auto h-6 w-6 text-primary" name="image" />
                <span className="mt-2 block font-bold">
                  {selectedFileName ?? "Klik untuk upload atau drag & drop"}
                </span>
                <span className="text-xs text-foreground-muted">
                  Format PNG/JPG sesuai batas konfigurasi backend
                </span>
              </span>
              <input
                accept="image/png,image/jpeg"
                className="sr-only"
                name="template"
                onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? null)}
                type="file"
              />
            </label>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-app border border-primary px-3 text-sm font-bold text-primary hover:bg-teal-50"
              type="submit"
            >
              Ganti File
            </button>
          </form>
          <dl className="mt-5 divide-y divide-border text-sm">
            <div className="flex justify-between gap-3 py-3">
              <dt className="font-bold text-navy">File Saat Ini</dt>
              <dd className="text-foreground-muted">template-bib-v{template.versionNumber}.png</dd>
            </div>
            <div className="flex justify-between gap-3 py-3">
              <dt className="font-bold text-navy">Ukuran Template</dt>
              <dd className="text-foreground-muted">
                {template.canvasWidth} x {template.canvasHeight} px
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-3">
              <dt className="font-bold text-navy">Orientasi</dt>
              <dd className="text-foreground-muted">{orientation}</dd>
            </div>
            <div className="flex justify-between gap-3 py-3">
              <dt className="font-bold text-navy">Ukuran Cetak Rekomendasi</dt>
              <dd className="text-foreground-muted">{recommendedPrint} (300 DPI)</dd>
            </div>
          </dl>
        </article>

        <form
          action={settingsAction}
          className="grid gap-5"
          id="bib-template-settings-form"
          onChange={(event) => updateFromForm(event.currentTarget)}
          onInput={(event) => updateFromForm(event.currentTarget)}
        >
          <input name="csrfToken" type="hidden" value={csrfToken} />
          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-base font-bold text-navy">2 Pengaturan Penempatan Elemen</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border text-xs font-bold text-navy">
                  <tr>
                    <th className="py-3">Elemen</th>
                    <th className="py-3">Posisi X</th>
                    <th className="py-3">Posisi Y</th>
                    <th className="py-3">Lebar</th>
                    <th className="py-3">Tinggi</th>
                    <th className="py-3">Font Size</th>
                    <th className="py-3">Tampil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 font-bold text-navy">Nomor BIB</td>
                    <td>
                      <input
                        className="w-20 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.numberAreaX}
                        name="numberAreaX"
                        type="number"
                      />
                    </td>
                    <td>
                      <input
                        className="w-20 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.numberAreaY}
                        name="numberAreaY"
                        type="number"
                      />
                    </td>
                    <td>
                      <input
                        className="w-24 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.numberAreaWidth}
                        name="numberAreaWidth"
                        type="number"
                      />
                    </td>
                    <td>
                      <input
                        className="w-24 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.numberAreaHeight}
                        name="numberAreaHeight"
                        type="number"
                      />
                    </td>
                    <td>
                      <select
                        className="w-24 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.fontSize}
                        name="fontSize"
                      >
                        {fontSizes.map((size) => (
                          <option key={size} value={size}>
                            {size}px
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="font-bold text-primary">Wajib</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-navy">Nama Peserta</td>
                    <td>
                      <input
                        className="w-20 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.participantNameX}
                        name="participantNameX"
                        type="number"
                      />
                    </td>
                    <td>
                      <input
                        className="w-20 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.participantNameY}
                        name="participantNameY"
                        type="number"
                      />
                    </td>
                    <td>
                      <input
                        className="w-24 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.participantNameWidth}
                        name="participantNameWidth"
                        type="number"
                      />
                    </td>
                    <td>
                      <input
                        className="w-24 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.participantNameHeight}
                        name="participantNameHeight"
                        type="number"
                      />
                    </td>
                    <td>
                      <select
                        className="w-24 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.participantNameFontSize}
                        name="participantNameFontSize"
                      >
                        {fontSizes.map((size) => (
                          <option key={size} value={size}>
                            {size}px
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        defaultChecked={settings.showParticipantName}
                        name="showParticipantName"
                        type="checkbox"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-navy">Kategori / Jarak</td>
                    <td>
                      <input
                        className="w-20 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.categoryLabelX}
                        name="categoryLabelX"
                        type="number"
                      />
                    </td>
                    <td>
                      <input
                        className="w-20 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.categoryLabelY}
                        name="categoryLabelY"
                        type="number"
                      />
                    </td>
                    <td>
                      <input
                        className="w-24 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.categoryLabelWidth}
                        name="categoryLabelWidth"
                        type="number"
                      />
                    </td>
                    <td>
                      <input
                        className="w-24 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.categoryLabelHeight}
                        name="categoryLabelHeight"
                        type="number"
                      />
                    </td>
                    <td>
                      <select
                        className="w-24 rounded-app border border-border px-2 py-2"
                        defaultValue={settings.categoryLabelFontSize}
                        name="categoryLabelFontSize"
                      >
                        {fontSizes.map((size) => (
                          <option key={size} value={size}>
                            {size}px
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        defaultChecked={settings.showCategoryLabel}
                        name="showCategoryLabel"
                        type="checkbox"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <label className="grid gap-1 text-xs font-bold text-navy">
                Font
                <select
                  className="min-h-10 rounded-app border border-border px-3"
                  defaultValue={settings.fontFamily}
                  name="fontFamily"
                >
                  {fontFamilies.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold text-navy">
                Berat Font
                <select
                  className="min-h-10 rounded-app border border-border px-3"
                  defaultValue={settings.fontWeight}
                  name="fontWeight"
                >
                  {fontWeights.map((weight) => (
                    <option key={weight} value={weight}>
                      {weight}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold text-navy">
                Warna
                <input
                  className="h-10 rounded-app border border-border px-2"
                  defaultValue={settings.textColor}
                  name="textColor"
                  type="color"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-navy">
                Rata
                <select
                  className="min-h-10 rounded-app border border-border px-3"
                  defaultValue={settings.textAlignment}
                  name="textAlignment"
                >
                  <option value="LEFT">Kiri</option>
                  <option value="CENTER">Tengah</option>
                  <option value="RIGHT">Kanan</option>
                </select>
              </label>
            </div>
          </article>

          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-base font-bold text-navy">3 Aturan Penomoran BIB</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <label className="grid gap-1 text-xs font-bold text-navy">
                Prefix
                <input
                  className="min-h-10 rounded-app border border-border px-3 text-sm font-bold text-navy"
                  defaultValue={settings.bibPrefix}
                  name="bibPrefix"
                />
              </label>
              <ControlInput
                label="Panjang Digit"
                max={8}
                min={1}
                name="numericPadding"
                value={settings.numericPadding}
              />
              <ControlInput
                label="Mulai Dari"
                min={1}
                name="sequenceStart"
                value={settings.sequenceStart}
              />
              <ControlInput
                label="Nomor Berikutnya"
                min={1}
                name="nextSequence"
                value={settings.nextSequence}
              />
              <label className="grid gap-1 text-xs font-bold text-navy">
                Suffix
                <input
                  className="min-h-10 rounded-app border border-border px-3 text-sm font-bold text-navy"
                  defaultValue={settings.bibSuffix ?? ""}
                  name="bibSuffix"
                />
              </label>
              <ControlInput
                label="Canvas Width"
                max={4000}
                min={600}
                name="templateCanvasWidth"
                value={settings.templateCanvasWidth}
              />
              <ControlInput
                label="Canvas Height"
                max={4000}
                min={400}
                name="templateCanvasHeight"
                value={settings.templateCanvasHeight}
              />
            </div>
            <p className="mt-4 rounded-app border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-info">
              Nomor preview saat ini: {nextBib}
            </p>
          </article>
        </form>
      </div>

      <div className="grid content-start gap-5">
        <PreviewCanvas sample={sample} settings={preview} template={template} />
        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-bold text-navy">Panduan Penempatan</h2>
          <ol className="mt-4 grid gap-3 text-sm text-navy">
            <li>1. Upload template gambar BIB dalam format PNG/JPG.</li>
            <li>2. Atur posisi X dan Y dari pojok kiri atas desain.</li>
            <li>3. Gunakan font size yang terbaca pada preview.</li>
            <li>4. Simpan draft sebelum publish ke event.</li>
          </ol>
        </article>
        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-bold text-navy">Tips Template</h2>
          <div className="mt-4 grid gap-3 text-sm text-navy">
            <p>Gunakan resolusi tinggi agar hasil cetak tetap tajam.</p>
            <p>Hindari teks penting terlalu dekat dengan tepi desain.</p>
            <p>Preview berubah realtime, lalu klik Simpan Draft untuk menyimpan.</p>
          </div>
        </article>
      </div>
    </div>
  );
}
