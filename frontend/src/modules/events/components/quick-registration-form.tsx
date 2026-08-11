"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import type { EventRecord } from "@/modules/events/event.types";
import { formatDistance } from "@/modules/events/components/event-display";
import type {
  PublicRegistrationFormState,
  PublicRegistrationFormValues,
} from "@/modules/registrations/registration-form-state";
import { DatePickerInput } from "@/shared/ui/date-picker-input";
import { Icon } from "@/shared/ui/icons";

type QuickRegistrationFormProps = {
  action: (
    state: PublicRegistrationFormState,
    formData: FormData,
  ) => Promise<PublicRegistrationFormState>;
  canBypassTurnstile: boolean;
  categories: EventCategoryRecord[];
  event: EventRecord;
  initialState: PublicRegistrationFormState;
  siteKey?: string;
};

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

function fieldClass(error?: string): string {
  return [
    "min-h-11 border-2 bg-[var(--color-landing-white)] px-3 text-sm text-[var(--color-landing-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]",
    error
      ? "border-danger focus-visible:border-danger"
      : "border-[var(--color-landing-ink)] focus-visible:border-[var(--color-landing-orange)]",
  ].join(" ");
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-bold text-danger">{message}</p> : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="landing-action mt-1 inline-flex min-h-12 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)] px-5 py-3 text-sm font-bold text-[var(--color-landing-white)] hover:bg-transparent hover:text-[var(--color-landing-ink)] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Mengirim..." : "Daftar Sekarang"}
      <Icon className="ml-2 h-4 w-4" name="arrow-right" />
    </button>
  );
}

export function QuickRegistrationForm({
  action,
  canBypassTurnstile,
  categories,
  event,
  initialState,
  siteKey,
}: QuickRegistrationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [values, setValues] = useState<PublicRegistrationFormValues>(initialState.values);
  const errors = state.fieldErrors;

  useEffect(() => {
    if (!state.formError && Object.keys(errors).length === 0) return;
    setValues(state.values);
    window.turnstile?.reset();
  }, [errors, state]);

  function updateValue(name: keyof PublicRegistrationFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateChecked(name: keyof PublicRegistrationFormValues, checked: boolean) {
    setValues((current) => ({ ...current, [name]: checked }));
  }

  return (
    <>
      {state.formError ? (
        <div className="mb-4 border border-danger/30 bg-danger/10 p-4 text-sm font-bold leading-6 text-danger">
          {state.formError}
        </div>
      ) : null}
      <form action={formAction} className="grid gap-4" noValidate>
        <input name="idempotencyKey" type="hidden" value={values.idempotencyKey} readOnly />
        {canBypassTurnstile ? (
          <input name="turnstileToken" type="hidden" value="development-bypass" readOnly />
        ) : null}

        <label className="grid gap-2 text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
          Nama Lengkap
          <input
            aria-invalid={Boolean(errors.fullName)}
            className={fieldClass(errors.fullName)}
            name="fullName"
            onChange={(event) => updateValue("fullName", event.target.value)}
            required
            value={values.fullName}
          />
          <FieldError message={errors.fullName} />
        </label>
        <label className="grid gap-2 text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
          Email
          <input
            aria-invalid={Boolean(errors.displayEmail)}
            className={fieldClass(errors.displayEmail)}
            name="displayEmail"
            onChange={(event) => updateValue("displayEmail", event.target.value)}
            required
            type="email"
            value={values.displayEmail}
          />
          <FieldError message={errors.displayEmail} />
        </label>
        <label className="grid gap-2 text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
          No. WhatsApp
          <input
            aria-invalid={Boolean(errors.displayPhone)}
            className={fieldClass(errors.displayPhone)}
            name="displayPhone"
            onChange={(event) => updateValue("displayPhone", event.target.value)}
            required
            type="tel"
            value={values.displayPhone}
          />
          <FieldError message={errors.displayPhone} />
        </label>

        <fieldset aria-invalid={Boolean(errors.gender)}>
          <legend className="text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
            Jenis Kelamin
          </legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--color-landing-ink-2)]">
            {([
              ["MALE", "Laki-laki"],
              ["FEMALE", "Perempuan"],
            ] as const).map(([value, label]) => (
              <label className="flex min-h-11 items-center gap-2" key={value}>
                <input
                  checked={values.gender === value}
                  className="h-4 w-4 accent-primary"
                  name="gender"
                  onChange={(event) => updateValue("gender", event.target.value)}
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
          <FieldError message={errors.gender} />
        </fieldset>

        <label className="grid gap-2 text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
          Tanggal Lahir
          <DatePickerInput
            ariaDescribedBy={errors.dateOfBirth ? "quick-date-of-birth-error" : undefined}
            ariaInvalid={Boolean(errors.dateOfBirth)}
            name="dateOfBirth"
            onChange={(value) => updateValue("dateOfBirth", value)}
            value={values.dateOfBirth}
          />
          <FieldError message={errors.dateOfBirth} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {([
            ["province", "Provinsi"],
            ["cityOrRegency", "Kota"],
          ] as const).map(([name, label]) => (
            <label className="grid gap-2 text-xs font-bold leading-5 text-[var(--color-landing-ink)]" key={name}>
              {label}
              <input
                aria-invalid={Boolean(errors[name])}
                className={fieldClass(errors[name])}
                name={name}
                onChange={(event) => updateValue(name, event.target.value)}
                required
                value={values[name]}
              />
              <FieldError message={errors[name]} />
            </label>
          ))}
        </div>

        <label className="grid gap-2 text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
          Pilih Kategori / Jarak
          <select
            aria-invalid={Boolean(errors.categoryIds)}
            className={fieldClass(errors.categoryIds)}
            name="categoryIds"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                categoryIds: event.target.value ? [event.target.value] : [],
              }))
            }
            required
            value={values.categoryIds[0] ?? ""}
          >
            <option value="">Pilih kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} - {formatDistance(category.distanceMeters)}
              </option>
            ))}
          </select>
          <FieldError message={errors.categoryIds} />
        </label>

        {event.emergencyContactEnabled ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <input
              className={fieldClass(errors.emergencyContactName)}
              name="emergencyContactName"
              onChange={(event) => updateValue("emergencyContactName", event.target.value)}
              placeholder="Nama kontak darurat"
              value={values.emergencyContactName}
            />
            <input
              className={fieldClass(errors.emergencyContactPhone)}
              name="emergencyContactPhone"
              onChange={(event) => updateValue("emergencyContactPhone", event.target.value)}
              placeholder="Nomor kontak darurat"
              type="tel"
              value={values.emergencyContactPhone}
            />
          </div>
        ) : null}

        <div className="grid gap-2 border-t border-[var(--color-landing-rule)] pt-4 text-xs leading-5 text-[var(--color-landing-ink-2)]">
          {([
            ["termsAccepted", "Saya telah membaca dan menyetujui Peraturan Event."],
            ["privacyAccepted", "Saya menyetujui kebijakan privasi dan penggunaan data event."],
            ["dataStatementAccepted", "Saya menyatakan data yang dikirim benar dan milik saya sendiri."],
          ] as const).map(([name, label]) => (
            <div key={name}>
              <label className="flex min-h-11 items-start gap-2 py-1">
                <input
                  aria-invalid={Boolean(errors[name])}
                  checked={values[name]}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  name={name}
                  onChange={(event) => updateChecked(name, event.target.checked)}
                  required
                  type="checkbox"
                />
                <span>{label}</span>
              </label>
              <FieldError message={errors[name]} />
            </div>
          ))}
        </div>

        {!canBypassTurnstile && siteKey ? (
          <>
            <div className="cf-turnstile" data-sitekey={siteKey} />
            <FieldError message={errors.turnstileToken} />
          </>
        ) : null}
        <SubmitButton />
      </form>
      <Link className="mt-3 inline-flex text-xs font-bold text-primary" href="#peraturan">
        Lihat peraturan event
      </Link>
    </>
  );
}
