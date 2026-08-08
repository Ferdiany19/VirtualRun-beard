"use client";

import { useMemo, useRef, useState } from "react";
import type { BibSettings, BibTemplateVersion } from "@/modules/bib/bib.types";
import { Icon, type IconName } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

type ServerFormAction = (formData: FormData) => void | Promise<void>;
type BibEditorTab = "number" | "template" | "position" | "preview" | "guide";
type PositionElement = "number" | "name" | "category";

type BibSettingsEditorProps = {
  eventHref: string;
  eventName: string;
  initialTab?: BibEditorTab;
  settingsAction: ServerFormAction;
  uploadAction: ServerFormAction;
  csrfToken: string;
  settings: BibSettings;
  templates: BibTemplateVersion[];
};

type PreviewSettings = {
  bibPrefix: string;
  bibSuffix: string;
  numericPadding: number;
  nextSequence: number;
  textColor: string;
  fontFamily: BibSettings["fontFamily"];
  fontSize: number;
  fontWeight: BibSettings["fontWeight"];
  textAlignment: BibSettings["textAlignment"];
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

const tabs: Array<{ id: BibEditorTab; label: string; icon: IconName }> = [
  { id: "number", label: "Pengaturan Nomor", icon: "settings" },
  { id: "template", label: "Template & Desain", icon: "image" },
  { id: "position", label: "Posisi & Teks", icon: "crosshair" },
  { id: "preview", label: "Preview", icon: "eye" },
  { id: "guide", label: "Aturan & Panduan", icon: "info" },
];

const panelClass = "rounded-app border border-border bg-surface p-5";

function toNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold text-navy">
      {label}
      {children}
      {hint ? (
        <span className="text-[11px] font-normal leading-5 text-foreground-muted">{hint}</span>
      ) : null}
    </label>
  );
}

function NumberInput({
  label,
  name,
  value,
  min = 0,
  max = 4000,
}: {
  label: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <input
        className="form-control"
        defaultValue={value}
        max={max}
        min={min}
        name={name}
        type="number"
      />
    </Field>
  );
}

function Toggle({
  defaultChecked,
  description,
  disabled = false,
  label,
  name,
}: {
  defaultChecked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  name: string;
}) {
  return (
    <label
      className={[
        "flex min-h-12 items-center justify-between gap-4",
        disabled ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
    >
      <span>
        <span className="block text-xs font-bold text-navy">{label}</span>
        <span className="mt-1 block text-[11px] leading-5 text-foreground-muted">
          {description}
        </span>
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          className="peer sr-only"
          defaultChecked={defaultChecked}
          disabled={disabled}
          name={name}
          type="checkbox"
        />
        <span className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-primary" />
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function textPosition(
  alignment: BibSettings["textAlignment"],
  x: number,
  width: number,
): { x: number; anchor: "start" | "middle" | "end" } {
  if (alignment === "LEFT") {
    return { x, anchor: "start" };
  }

  if (alignment === "RIGHT") {
    return { x: x + width, anchor: "end" };
  }

  return { x: x + width / 2, anchor: "middle" };
}

function BibCanvas({
  activeTemplate,
  category,
  fullName,
  preview,
  sampleBib,
  selectedElement,
}: {
  activeTemplate: BibTemplateVersion | undefined;
  category: string;
  fullName: string;
  preview: PreviewSettings;
  sampleBib: string;
  selectedElement?: PositionElement;
}) {
  const numberPosition = textPosition(
    preview.textAlignment,
    preview.numberAreaX,
    preview.numberAreaWidth,
  );
  const namePosition = textPosition(
    preview.textAlignment,
    preview.participantNameX,
    preview.participantNameWidth,
  );
  const categoryPosition = textPosition(
    preview.textAlignment,
    preview.categoryLabelX,
    preview.categoryLabelWidth,
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-app border border-border bg-surface-muted"
      style={{
        aspectRatio: `${preview.templateCanvasWidth} / ${preview.templateCanvasHeight}`,
      }}
    >
      {activeTemplate ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`Template BIB versi ${activeTemplate.versionNumber}`}
          className="absolute inset-0 h-full w-full object-fill"
          src={`/api/admin/bib/template-preview?templateVersionId=${activeTemplate.id}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground-muted">
          Upload template PNG untuk memulai preview.
        </div>
      )}
      <svg
        aria-label="Live preview posisi elemen BIB"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${preview.templateCanvasWidth} ${preview.templateCanvasHeight}`}
      >
        {selectedElement === "number" ? (
          <rect
            fill="rgb(0 154 137 / 0.08)"
            height={preview.numberAreaHeight}
            stroke="#009a89"
            strokeDasharray="8 6"
            strokeWidth="3"
            width={preview.numberAreaWidth}
            x={preview.numberAreaX}
            y={preview.numberAreaY}
          />
        ) : null}
        <text
          dominantBaseline="middle"
          fill={preview.textColor}
          fontFamily={preview.fontFamily}
          fontSize={preview.fontSize}
          fontWeight={preview.fontWeight}
          textAnchor={numberPosition.anchor}
          x={numberPosition.x}
          y={preview.numberAreaY + preview.numberAreaHeight / 2}
        >
          {sampleBib}
        </text>

        {preview.showParticipantName ? (
          <>
            {selectedElement === "name" ? (
              <rect
                fill="rgb(0 154 137 / 0.08)"
                height={preview.participantNameHeight}
                stroke="#009a89"
                strokeDasharray="8 6"
                strokeWidth="3"
                width={preview.participantNameWidth}
                x={preview.participantNameX}
                y={preview.participantNameY}
              />
            ) : null}
            <text
              dominantBaseline="middle"
              fill={preview.textColor}
              fontFamily={preview.fontFamily}
              fontSize={preview.participantNameFontSize}
              fontWeight="600"
              textAnchor={namePosition.anchor}
              x={namePosition.x}
              y={preview.participantNameY + preview.participantNameHeight / 2}
            >
              {fullName}
            </text>
          </>
        ) : null}

        {preview.showCategoryLabel ? (
          <>
            {selectedElement === "category" ? (
              <rect
                fill="rgb(0 154 137 / 0.08)"
                height={preview.categoryLabelHeight}
                stroke="#009a89"
                strokeDasharray="8 6"
                strokeWidth="3"
                width={preview.categoryLabelWidth}
                x={preview.categoryLabelX}
                y={preview.categoryLabelY}
              />
            ) : null}
            <text
              dominantBaseline="middle"
              fill={preview.textColor}
              fontFamily={preview.fontFamily}
              fontSize={preview.categoryLabelFontSize}
              fontWeight="500"
              textAnchor={categoryPosition.anchor}
              x={categoryPosition.x}
              y={preview.categoryLabelY + preview.categoryLabelHeight / 2}
            >
              {category}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}

export function BibSettingsEditor({
  eventHref,
  eventName,
  initialTab = "number",
  settingsAction,
  uploadAction,
  csrfToken,
  settings,
  templates,
}: BibSettingsEditorProps) {
  const [activeTab, setActiveTab] = useState<BibEditorTab>(initialTab);
  const [positionElement, setPositionElement] = useState<PositionElement>("number");
  const [sampleName, setSampleName] = useState("Nama Peserta");
  const [sampleCategory, setSampleCategory] = useState("5K");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const activeTemplate = templates.find(
    (template) => template.id === settings.activeTemplateVersionId,
  );
  const [preview, setPreview] = useState<PreviewSettings>({
    bibPrefix: settings.bibPrefix,
    bibSuffix: settings.bibSuffix ?? "",
    numericPadding: settings.numericPadding,
    nextSequence: settings.nextSequence,
    textColor: settings.textColor,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    fontWeight: settings.fontWeight,
    textAlignment: settings.textAlignment,
    numberAreaX: settings.numberAreaX,
    numberAreaY: settings.numberAreaY,
    numberAreaWidth: settings.numberAreaWidth,
    numberAreaHeight: settings.numberAreaHeight,
    showParticipantName: settings.showParticipantName,
    participantNameX: settings.participantNameX,
    participantNameY: settings.participantNameY,
    participantNameWidth: settings.participantNameWidth,
    participantNameHeight: settings.participantNameHeight,
    participantNameFontSize: settings.participantNameFontSize,
    showCategoryLabel: settings.showCategoryLabel,
    categoryLabelX: settings.categoryLabelX,
    categoryLabelY: settings.categoryLabelY,
    categoryLabelWidth: settings.categoryLabelWidth,
    categoryLabelHeight: settings.categoryLabelHeight,
    categoryLabelFontSize: settings.categoryLabelFontSize,
    templateCanvasWidth: settings.templateCanvasWidth,
    templateCanvasHeight: settings.templateCanvasHeight,
  });
  const sampleBib = useMemo(
    () =>
      `${preview.bibPrefix}${String(preview.nextSequence).padStart(preview.numericPadding, "0")}${preview.bibSuffix}`,
    [preview.bibPrefix, preview.bibSuffix, preview.nextSequence, preview.numericPadding],
  );

  function updatePreview(formData: FormData) {
    setPreview((current) => ({
      ...current,
      bibPrefix: String(formData.get("bibPrefix") ?? current.bibPrefix),
      bibSuffix: String(formData.get("bibSuffix") ?? current.bibSuffix),
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
      categoryLabelHeight: toNumber(
        formData.get("categoryLabelHeight"),
        current.categoryLabelHeight,
      ),
      categoryLabelFontSize: toNumber(
        formData.get("categoryLabelFontSize"),
        current.categoryLabelFontSize,
      ),
    }));
  }

  async function downloadPreview() {
    const canvas = document.createElement("canvas");
    canvas.width = preview.templateCanvasWidth;
    canvas.height = preview.templateCanvasHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const renderingContext = context;
    renderingContext.fillStyle = "#ffffff";
    renderingContext.fillRect(0, 0, canvas.width, canvas.height);

    if (activeTemplate) {
      const response = await fetch(
        `/api/admin/bib/template-preview?templateVersionId=${activeTemplate.id}`,
      );
      const blob = await response.blob();
      const image = await createImageBitmap(blob);
      renderingContext.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
    }

    function drawText(input: {
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      size: number;
      weight: number;
    }) {
      const position = textPosition(preview.textAlignment, input.x, input.width);
      renderingContext.fillStyle = preview.textColor;
      renderingContext.font = `${input.weight} ${input.size}px ${preview.fontFamily}`;
      renderingContext.textAlign = position.anchor === "middle" ? "center" : position.anchor;
      renderingContext.textBaseline = "middle";
      renderingContext.fillText(input.text, position.x, input.y + input.height / 2, input.width);
    }

    drawText({
      text: sampleBib,
      x: preview.numberAreaX,
      y: preview.numberAreaY,
      width: preview.numberAreaWidth,
      height: preview.numberAreaHeight,
      size: preview.fontSize,
      weight: preview.fontWeight,
    });

    if (preview.showParticipantName) {
      drawText({
        text: sampleName,
        x: preview.participantNameX,
        y: preview.participantNameY,
        width: preview.participantNameWidth,
        height: preview.participantNameHeight,
        size: preview.participantNameFontSize,
        weight: 600,
      });
    }

    if (preview.showCategoryLabel) {
      drawText({
        text: sampleCategory,
        x: preview.categoryLabelX,
        y: preview.categoryLabelY,
        width: preview.categoryLabelWidth,
        height: preview.categoryLabelHeight,
        size: preview.categoryLabelFontSize,
        weight: 500,
      });
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${sampleBib || "preview-bib"}.png`;
      anchor.click();
      URL.revokeObjectURL(href);
    }, "image/png");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-foreground-muted">
            Event <span className="px-1.5">/</span> {eventName} <span className="px-1.5">/</span>{" "}
            Template BIB
          </p>
          <h1 className="mt-5 text-2xl font-bold text-navy">Template BIB</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Atur format nomor BIB, nomor awal, dan tampilan BIB untuk event ini.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-app border border-border px-4 text-sm font-bold text-navy hover:border-primary"
            href={eventHref}
          >
            Lihat Event
          </a>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover"
            form="bib-settings-form"
            type="submit"
          >
            <Icon className="h-4 w-4" name="check" />
            Simpan Perubahan
          </button>
        </div>
      </header>

      <nav aria-label="Bagian pengaturan BIB" className="overflow-x-auto border-b border-border">
        <div className="flex min-w-max gap-7">
          {tabs.map((tab) => (
            <button
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={[
                "relative flex min-h-12 items-center gap-2 pb-1 text-xs font-bold transition-colors",
                activeTab === tab.id
                  ? "text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                  : "text-foreground-muted hover:text-navy",
              ].join(" ")}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon className="h-4 w-4" name={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <form
        action={settingsAction}
        className={activeTab === "number" || activeTab === "position" ? "block" : "hidden"}
        id="bib-settings-form"
        onChange={(event) => updatePreview(new FormData(event.currentTarget))}
        onInput={(event) => updatePreview(new FormData(event.currentTarget))}
      >
        <input name="csrfToken" type="hidden" value={csrfToken} />
        <input name="templateCanvasWidth" type="hidden" value={settings.templateCanvasWidth} />
        <input name="templateCanvasHeight" type="hidden" value={settings.templateCanvasHeight} />

        <div className={activeTab === "number" ? "grid gap-5 lg:grid-cols-2" : "hidden"}>
          <section className={panelClass}>
            <h2 className="text-base font-bold text-navy">Pengaturan Nomor BIB</h2>
            <p className="mt-2 text-xs leading-5 text-foreground-muted">
              Tentukan format dan pengaturan nomor BIB untuk event ini.
            </p>
            <div className="mt-5 grid gap-4">
              <Field label="Prefix BIB" hint="Contoh: VR25, VR2026, atau RUN25">
                <input
                  className="form-control"
                  defaultValue={settings.bibPrefix}
                  maxLength={16}
                  name="bibPrefix"
                />
              </Field>
              <Field label="Digit Nomor" hint="Jumlah digit angka. Contoh: 4 menghasilkan 0001">
                <input
                  className="form-control"
                  defaultValue={settings.numericPadding}
                  max={8}
                  min={1}
                  name="numericPadding"
                  type="number"
                />
              </Field>
              <Field label="Nomor Awal" hint="Nomor pertama yang digunakan saat event baru dimulai">
                <input
                  className="form-control"
                  defaultValue={settings.sequenceStart}
                  min={1}
                  name="sequenceStart"
                  type="number"
                />
              </Field>
              <Field label="Nomor Berikutnya" hint="Dikelola otomatis setelah peserta mendaftar">
                <input
                  className="form-control"
                  defaultValue={settings.nextSequence}
                  min={settings.sequenceStart}
                  name="nextSequence"
                  type="number"
                />
              </Field>
              <Field label="Suffix BIB" hint="Opsional, ditambahkan setelah nomor">
                <input
                  className="form-control"
                  defaultValue={settings.bibSuffix ?? ""}
                  maxLength={16}
                  name="bibSuffix"
                />
              </Field>
              <div className="border-t border-border pt-4">
                <Toggle
                  defaultChecked
                  description="Nomor bertambah otomatis dan dikunci secara transaksional setiap pendaftaran."
                  disabled
                  label="Auto Increment"
                  name="autoIncrementDisplay"
                />
              </div>
            </div>

            <div className="mt-5 rounded-app border border-border bg-surface-muted p-4">
              <p className="text-xs font-bold text-foreground-muted">Preview Format</p>
              <p className="mt-2 text-xl font-bold text-primary">{sampleBib}</p>
              <p className="mt-2 text-[11px] text-foreground-muted">
                Format final yang akan digunakan.
              </p>
            </div>
          </section>

          <div className="grid content-start gap-5">
            <section className={panelClass}>
              <h2 className="text-base font-bold text-navy">Live Preview BIB</h2>
              <p className="mt-2 text-xs text-foreground-muted">
                Data peserta pada preview hanya contoh.
              </p>
              <div className="mt-5">
                <BibCanvas
                  activeTemplate={activeTemplate}
                  category={sampleCategory}
                  fullName={sampleName}
                  preview={preview}
                  sampleBib={sampleBib}
                />
              </div>
            </section>
            <InfoPanel
              items={[
                "Nomor BIB digenerate otomatis saat peserta mendaftar.",
                "Format nomor dipakai oleh seluruh pendaftaran baru di event ini.",
                "Perubahan tidak mengubah nomor peserta yang sudah terdaftar.",
              ]}
              title="Informasi"
            />
          </div>
        </div>

        <div
          className={activeTab === "position" ? "grid gap-5 xl:grid-cols-[1fr_1.1fr]" : "hidden"}
        >
          <section className={panelClass}>
            <h2 className="text-base font-bold text-navy">Pengaturan Posisi Teks</h2>
            <p className="mt-2 text-xs text-foreground-muted">
              Atur posisi dan style teks yang ditampilkan pada BIB.
            </p>
            <div className="mt-5">
              <Field label="Elemen Teks">
                <select
                  className="form-select"
                  onChange={(event) => setPositionElement(event.target.value as PositionElement)}
                  value={positionElement}
                >
                  <option value="number">Nomor BIB</option>
                  <option value="name">Nama Peserta</option>
                  <option value="category">Kategori</option>
                </select>
              </Field>
            </div>

            <div
              className={positionElement === "number" ? "mt-5 grid gap-4 sm:grid-cols-2" : "hidden"}
            >
              <NumberInput label="Posisi X" name="numberAreaX" value={settings.numberAreaX} />
              <NumberInput label="Posisi Y" name="numberAreaY" value={settings.numberAreaY} />
              <NumberInput
                label="Lebar Area"
                name="numberAreaWidth"
                value={settings.numberAreaWidth}
                min={1}
              />
              <NumberInput
                label="Tinggi Area"
                name="numberAreaHeight"
                value={settings.numberAreaHeight}
                min={1}
              />
              <NumberInput
                label="Ukuran Font"
                name="fontSize"
                value={settings.fontSize}
                min={16}
                max={240}
              />
              <Field label="Warna Teks">
                <div className="flex gap-2">
                  <input
                    aria-label="Pilih warna teks"
                    className="h-11 w-12 rounded-app border border-border bg-surface p-1"
                    defaultValue={settings.textColor}
                    name="textColor"
                    type="color"
                  />
                  <input
                    aria-label="Kode warna teks"
                    className="form-control"
                    defaultValue={settings.textColor}
                    onChange={(event) => {
                      const colorInput = event.currentTarget.form?.elements.namedItem("textColor");
                      if (colorInput instanceof HTMLInputElement) {
                        colorInput.value = event.target.value;
                      }
                    }}
                  />
                </div>
              </Field>
              <Field label="Font Family">
                <select
                  className="form-select"
                  defaultValue={settings.fontFamily}
                  name="fontFamily"
                >
                  {["Montserrat", "Arial", "Helvetica", "Georgia", "Times New Roman"].map(
                    (font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Ketebalan">
                <select
                  className="form-select"
                  defaultValue={settings.fontWeight}
                  name="fontWeight"
                >
                  {[400, 500, 600, 700, 800].map((weight) => (
                    <option key={weight} value={weight}>
                      {weight}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Perataan">
                <select
                  className="form-select"
                  defaultValue={settings.textAlignment}
                  name="textAlignment"
                >
                  <option value="LEFT">Kiri</option>
                  <option value="CENTER">Tengah</option>
                  <option value="RIGHT">Kanan</option>
                </select>
              </Field>
            </div>

            <div
              className={positionElement === "name" ? "mt-5 grid gap-4 sm:grid-cols-2" : "hidden"}
            >
              <div className="sm:col-span-2">
                <Toggle
                  defaultChecked={settings.showParticipantName}
                  description="Nama peserta akan dirender oleh worker ke BIB."
                  label="Tampilkan Nama Peserta"
                  name="showParticipantName"
                />
              </div>
              <NumberInput
                label="Posisi X"
                name="participantNameX"
                value={settings.participantNameX}
              />
              <NumberInput
                label="Posisi Y"
                name="participantNameY"
                value={settings.participantNameY}
              />
              <NumberInput
                label="Lebar Area"
                name="participantNameWidth"
                value={settings.participantNameWidth}
                min={1}
              />
              <NumberInput
                label="Tinggi Area"
                name="participantNameHeight"
                value={settings.participantNameHeight}
                min={1}
              />
              <NumberInput
                label="Ukuran Font"
                name="participantNameFontSize"
                value={settings.participantNameFontSize}
                min={10}
                max={180}
              />
            </div>

            <div
              className={
                positionElement === "category" ? "mt-5 grid gap-4 sm:grid-cols-2" : "hidden"
              }
            >
              <div className="sm:col-span-2">
                <Toggle
                  defaultChecked={settings.showCategoryLabel}
                  description="Nama kategori yang dipilih peserta akan ditampilkan."
                  label="Tampilkan Kategori"
                  name="showCategoryLabel"
                />
              </div>
              <NumberInput label="Posisi X" name="categoryLabelX" value={settings.categoryLabelX} />
              <NumberInput label="Posisi Y" name="categoryLabelY" value={settings.categoryLabelY} />
              <NumberInput
                label="Lebar Area"
                name="categoryLabelWidth"
                value={settings.categoryLabelWidth}
                min={1}
              />
              <NumberInput
                label="Tinggi Area"
                name="categoryLabelHeight"
                value={settings.categoryLabelHeight}
                min={1}
              />
              <NumberInput
                label="Ukuran Font"
                name="categoryLabelFontSize"
                value={settings.categoryLabelFontSize}
                min={10}
                max={180}
              />
            </div>
          </section>

          <div className="grid content-start gap-5">
            <section className={panelClass}>
              <h2 className="text-base font-bold text-navy">Preview dengan Posisi</h2>
              <div className="mt-5">
                <BibCanvas
                  activeTemplate={activeTemplate}
                  category={sampleCategory}
                  fullName={sampleName}
                  preview={preview}
                  sampleBib={sampleBib}
                  selectedElement={positionElement}
                />
              </div>
            </section>
            <section className={panelClass}>
              <h2 className="text-sm font-bold text-navy">Daftar Elemen</h2>
              <div className="mt-4 divide-y divide-border">
                {[
                  ["number", "Nomor BIB", preview.numberAreaX, preview.numberAreaY],
                  ["name", "Nama Peserta", preview.participantNameX, preview.participantNameY],
                  ["category", "Kategori", preview.categoryLabelX, preview.categoryLabelY],
                ].map(([id, label, x, y]) => (
                  <button
                    className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs"
                    key={String(id)}
                    onClick={() => setPositionElement(id as PositionElement)}
                    type="button"
                  >
                    <span className="font-bold text-navy">{label}</span>
                    <span className="text-foreground-muted">
                      X: {x} · Y: {y}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </form>

      <div className={activeTab === "template" ? "grid gap-5 xl:grid-cols-[1fr_360px]" : "hidden"}>
        <div className="grid content-start gap-5">
          <form action={uploadAction} className={panelClass}>
            <input name="csrfToken" type="hidden" value={csrfToken} />
            <h2 className="text-base font-bold text-navy">Upload Template BIB</h2>
            <p className="mt-2 text-xs text-foreground-muted">
              Upload template PNG yang akan digunakan sebagai desain dasar.
            </p>
            <label
              className="mt-5 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-app border border-dashed border-border bg-surface-muted p-6 text-center hover:border-primary"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];

                if (!file || !templateInputRef.current) {
                  return;
                }

                const transfer = new DataTransfer();
                transfer.items.add(file);
                templateInputRef.current.files = transfer.files;
                setSelectedFileName(file.name);
              }}
            >
              <input
                accept="image/png"
                className="sr-only"
                name="template"
                onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? null)}
                ref={templateInputRef}
                required
                type="file"
              />
              <Icon className="h-10 w-10 text-foreground-muted" name="upload" />
              <p className="mt-4 text-sm font-bold text-navy">
                {selectedFileName ?? "Drag & drop atau pilih template di sini"}
              </p>
              <span className="mt-4 rounded-app bg-primary px-4 py-2 text-xs font-bold text-white">
                Pilih File
              </span>
              <p className="mt-4 text-[11px] leading-5 text-foreground-muted">
                Format PNG · Rekomendasi minimum 1200 × 800 px
              </p>
            </label>
            <button className="mt-4 min-h-11 rounded-app bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover">
              Upload dan Aktifkan
            </button>
          </form>
          <InfoPanel
            items={[
              "Gunakan background dengan kontras yang cukup.",
              "Pastikan area nomor, nama, dan kategori memiliki ruang yang bersih.",
              "Template baru disimpan sebagai versi baru dan langsung diaktifkan.",
              "File PNG tetap privat dan hanya dapat diakses pengguna berizin.",
            ]}
            title="Tips Template"
          />
        </div>

        <section className={panelClass}>
          <h2 className="text-base font-bold text-navy">Template Saat Ini</h2>
          <div className="mt-5">
            <BibCanvas
              activeTemplate={activeTemplate}
              category={sampleCategory}
              fullName={sampleName}
              preview={preview}
              sampleBib={sampleBib}
            />
          </div>
          {activeTemplate ? (
            <div className="mt-4 rounded-app border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-navy">
                  template-bib-v{activeTemplate.versionNumber}.png
                </p>
                <StatusBadge tone="success">Aktif</StatusBadge>
              </div>
              <p className="mt-2 text-[11px] text-foreground-muted">
                PNG · {(activeTemplate.fileSizeBytes / 1024).toFixed(0)} KB ·{" "}
                {activeTemplate.canvasWidth} × {activeTemplate.canvasHeight} px
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-foreground-muted">Belum ada template aktif.</p>
          )}
          {templates.length > 1 ? (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-xs font-bold text-navy">Riwayat Versi</h3>
              <div className="mt-3 grid gap-2">
                {templates.slice(0, 5).map((template) => (
                  <div
                    className="flex items-center justify-between rounded-app bg-surface-muted px-3 py-2 text-xs"
                    key={template.id}
                  >
                    <span className="font-bold text-navy">Versi {template.versionNumber}</span>
                    <span className="text-foreground-muted">
                      {template.canvasWidth} × {template.canvasHeight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div
        className={
          activeTab === "preview" ? "grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]" : "hidden"
        }
      >
        <section className={panelClass}>
          <h2 className="text-base font-bold text-navy">Data Preview</h2>
          <p className="mt-2 text-xs text-foreground-muted">
            Masukkan data contoh untuk melihat preview BIB.
          </p>
          <div className="mt-5 grid gap-4">
            <Field label="Nama Peserta">
              <input
                className="form-control"
                onChange={(event) => setSampleName(event.target.value)}
                value={sampleName}
              />
            </Field>
            <Field label="Kategori">
              <input
                className="form-control"
                onChange={(event) => setSampleCategory(event.target.value)}
                value={sampleCategory}
              />
            </Field>
            <Field label="Nomor Preview">
              <input className="form-control bg-surface-muted" readOnly value={sampleBib} />
            </Field>
          </div>
        </section>

        <div className="grid content-start gap-5">
          <section className={panelClass}>
            <h2 className="text-base font-bold text-navy">Preview BIB Lengkap</h2>
            <p className="mt-2 text-xs text-foreground-muted">
              Berikut adalah preview BIB dengan data contoh.
            </p>
            <div className="mx-auto mt-5 max-w-3xl">
              <BibCanvas
                activeTemplate={activeTemplate}
                category={sampleCategory}
                fullName={sampleName}
                preview={preview}
                sampleBib={sampleBib}
              />
            </div>
            <div className="mt-5 flex justify-center">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-primary px-5 text-sm font-bold text-primary hover:bg-primary/5"
                onClick={downloadPreview}
                type="button"
              >
                <Icon className="h-4 w-4" name="download" />
                Download PNG
              </button>
            </div>
          </section>
          <InfoPanel
            items={[
              "Preview menggunakan konfigurasi form yang sedang Anda edit.",
              "Data contoh tidak disimpan dan tidak mengubah data peserta.",
              "Download PNG menghasilkan preview sesuai template dan posisi saat ini.",
            ]}
            title="Informasi Preview"
          />
        </div>
      </div>

      <div className={activeTab === "guide" ? "grid gap-5 lg:grid-cols-2" : "hidden"}>
        <section className={panelClass}>
          <h2 className="text-base font-bold text-navy">Panduan Penggunaan BIB</h2>
          <p className="mt-2 text-xs text-foreground-muted">
            Informasi penting tentang penggunaan dan aturan BIB.
          </p>
          <div className="mt-5 grid gap-5 text-xs leading-6 text-foreground-muted">
            <GuideSection
              items={[
                "BIB bersifat pribadi dan tidak boleh dipindahtangankan.",
                "Satu peserta menggunakan satu nomor BIB dalam event yang sama.",
                "Nomor peserta lama tidak berubah saat format baru disimpan.",
              ]}
              title="Peserta"
            />
            <GuideSection
              items={[
                "Gunakan template PNG final dengan area teks yang bersih.",
                "Samakan ukuran canvas dengan dimensi template aktif.",
                "Koordinat dihitung dari sudut kiri atas dalam satuan pixel.",
              ]}
              title="Template dan Posisi"
            />
            <GuideSection
              items={[
                "BIB dibuat oleh worker setelah pendaftaran berhasil.",
                "Template baru berlaku otomatis untuk pendaftaran berikutnya.",
                "BIB lama dapat dibuat ulang dari detail peserta bila diperlukan.",
              ]}
              title="Operasional"
            />
          </div>
        </section>
        <div className="grid content-start gap-5">
          <section className={panelClass}>
            <h2 className="text-base font-bold text-navy">Pengaturan Tambahan</h2>
            <div className="mt-4 divide-y divide-border text-xs">
              <SettingStatus
                active={preview.showCategoryLabel}
                description="Menampilkan kategori yang dipilih peserta di BIB."
                label="Tampilkan Kategori di BIB"
              />
              <SettingStatus
                active={preview.showParticipantName}
                description="Menampilkan nama peserta pada area yang sudah diatur."
                label="Tampilkan Nama Peserta"
              />
            </div>
            <button
              className="mt-4 min-h-11 rounded-app border border-primary px-4 text-xs font-bold text-primary hover:bg-primary/5"
              onClick={() => setActiveTab("position")}
              type="button"
            >
              Atur Posisi & Teks
            </button>
          </section>
          <div className="rounded-app border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <Icon className="h-5 w-5 shrink-0 text-warning" name="info" />
              <div>
                <h2 className="text-sm font-bold text-amber-900">Perhatian</h2>
                <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5 text-amber-900/80">
                  <li>Perubahan format hanya digunakan untuk alokasi BIB baru.</li>
                  <li>Peserta yang sudah memiliki BIB tidak berubah otomatis.</li>
                  <li>Periksa preview sebelum menyimpan perubahan.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-app border border-blue-200 bg-blue-50 p-5">
      <div className="flex gap-3">
        <Icon className="h-5 w-5 shrink-0 text-info" name="info" />
        <div>
          <h2 className="text-xs font-bold text-navy">{title}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-[11px] leading-5 text-navy-muted">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function GuideSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="font-bold text-navy">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function SettingStatus({
  active,
  description,
  label,
}: {
  active: boolean;
  description: string;
  label: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-2">
      <div>
        <p className="font-bold text-navy">{label}</p>
        <p className="mt-1 text-[11px] leading-5 text-foreground-muted">{description}</p>
      </div>
      <StatusBadge tone={active ? "success" : "neutral"}>
        {active ? "Aktif" : "Nonaktif"}
      </StatusBadge>
    </div>
  );
}
