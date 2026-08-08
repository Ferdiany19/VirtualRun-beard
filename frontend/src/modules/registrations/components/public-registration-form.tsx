"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import { formatDistance } from "@/modules/events/components/event-display";
import type {
  PublicRegistrationFormState,
  PublicRegistrationFormValues,
} from "@/modules/registrations/registration-form-state";
import { DatePickerInput } from "@/shared/ui/date-picker-input";
import { Icon } from "@/shared/ui/icons";

type PublicRegistrationFormProps = {
  action: (
    state: PublicRegistrationFormState,
    formData: FormData,
  ) => Promise<PublicRegistrationFormState>;
  canBypassTurnstile: boolean;
  categories: EventCategoryRecord[];
  initialState: PublicRegistrationFormState;
  siteKey?: string;
};

type FieldName = keyof PublicRegistrationFormState["fieldErrors"];

declare global {
  interface Window {
    turnstile?: {
      reset: () => void;
    };
  }
}

function fieldErrorId(name: FieldName): string {
  return `registration-${name}-error`;
}

function fieldClass(error?: string): string {
  return [
    "min-h-11 rounded-app border px-3 text-foreground focus:outline-none",
    error ? "border-danger focus:border-danger" : "border-border focus:border-primary",
  ].join(" ");
}

function FieldError({ name, message }: { name: FieldName; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-xs font-bold text-danger" id={fieldErrorId(name)}>
      {message}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-app bg-action px-5 py-3 text-sm font-bold text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Mengirim..." : "Kirim pendaftaran"}
      <Icon className="h-4 w-4" name="arrow-right" />
    </button>
  );
}

export function PublicRegistrationForm({
  action,
  canBypassTurnstile,
  categories,
  initialState,
  siteKey,
}: PublicRegistrationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [values, setValues] = useState<PublicRegistrationFormValues>(initialState.values);
  const errors = state.fieldErrors;

  useEffect(() => {
    if (!state.formError && Object.keys(errors).length < 1) return;
    setValues(state.values);
    window.turnstile?.reset();
  }, [state]);

  function updateValue(name: keyof PublicRegistrationFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateChecked(name: keyof PublicRegistrationFormValues, checked: boolean) {
    setValues((current) => ({ ...current, [name]: checked }));
  }

  function updateCategory(categoryId: string, checked: boolean) {
    setValues((current) => {
      const categoryIds = checked
        ? [...current.categoryIds, categoryId]
        : current.categoryIds.filter((item) => item !== categoryId);

      return { ...current, categoryIds };
    });
  }

  return (
    <>
      {state.formError ? (
        <div className="mt-5 rounded-app border border-red-200 bg-red-50 p-4 text-sm font-bold text-danger">
          {state.formError}
        </div>
      ) : null}

      <form action={formAction} className="mt-8 space-y-8" noValidate>
        <input name="idempotencyKey" type="hidden" value={values.idempotencyKey} readOnly />
        {canBypassTurnstile ? (
          <input name="turnstileToken" type="hidden" value="development-bypass" readOnly />
        ) : null}

        <section className="border-b border-border pb-8">
          <h2 className="text-xl font-bold text-navy">1. Kategori</h2>
          <div
            aria-describedby={errors.categoryIds ? fieldErrorId("categoryIds") : undefined}
            aria-invalid={Boolean(errors.categoryIds)}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            {categories.map((category) => (
              <label
                key={category.id}
                className={[
                  "flex min-h-16 cursor-pointer gap-3 rounded-app border bg-surface p-4 focus-within:border-primary",
                  errors.categoryIds ? "border-danger" : "border-border",
                ].join(" ")}
              >
                <input
                  checked={values.categoryIds.includes(category.id)}
                  className="mt-1 h-5 w-5 accent-primary"
                  name="categoryIds"
                  onChange={(event) => updateCategory(category.id, event.target.checked)}
                  type="checkbox"
                  value={category.id}
                />
                <span>
                  <span className="block font-bold text-navy">{category.name}</span>
                  <span className="small-copy">{formatDistance(category.distanceMeters)}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-2">
            <FieldError message={errors.categoryIds} name="categoryIds" />
          </div>
        </section>

        <section className="grid gap-5 border-b border-border pb-8">
          <h2 className="text-xl font-bold text-navy">2. Data peserta</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-navy">
              Nama lengkap
              <input
                aria-describedby={errors.fullName ? fieldErrorId("fullName") : undefined}
                aria-invalid={Boolean(errors.fullName)}
                className={fieldClass(errors.fullName)}
                name="fullName"
                onChange={(event) => updateValue("fullName", event.target.value)}
                value={values.fullName}
              />
              <FieldError message={errors.fullName} name="fullName" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Email
              <input
                aria-describedby={errors.displayEmail ? fieldErrorId("displayEmail") : undefined}
                aria-invalid={Boolean(errors.displayEmail)}
                className={fieldClass(errors.displayEmail)}
                name="displayEmail"
                onChange={(event) => updateValue("displayEmail", event.target.value)}
                type="email"
                value={values.displayEmail}
              />
              <FieldError message={errors.displayEmail} name="displayEmail" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Nomor HP
              <input
                aria-describedby={errors.displayPhone ? fieldErrorId("displayPhone") : undefined}
                aria-invalid={Boolean(errors.displayPhone)}
                className={fieldClass(errors.displayPhone)}
                name="displayPhone"
                onChange={(event) => updateValue("displayPhone", event.target.value)}
                value={values.displayPhone}
              />
              <FieldError message={errors.displayPhone} name="displayPhone" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Gender
              <select
                aria-describedby={errors.gender ? fieldErrorId("gender") : undefined}
                aria-invalid={Boolean(errors.gender)}
                className={fieldClass(errors.gender)}
                name="gender"
                onChange={(event) => updateValue("gender", event.target.value)}
                value={values.gender}
              >
                <option value="">Tidak diisi</option>
                <option value="MALE">Laki-laki</option>
                <option value="FEMALE">Perempuan</option>
                <option value="OTHER">Lainnya</option>
              </select>
              <FieldError message={errors.gender} name="gender" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Tanggal lahir
              <DatePickerInput
                ariaDescribedBy={errors.dateOfBirth ? fieldErrorId("dateOfBirth") : undefined}
                ariaInvalid={Boolean(errors.dateOfBirth)}
                name="dateOfBirth"
                onChange={(value) => updateValue("dateOfBirth", value)}
                value={values.dateOfBirth}
              />
              <FieldError message={errors.dateOfBirth} name="dateOfBirth" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Provinsi
              <input
                aria-describedby={errors.province ? fieldErrorId("province") : undefined}
                aria-invalid={Boolean(errors.province)}
                className={fieldClass(errors.province)}
                name="province"
                onChange={(event) => updateValue("province", event.target.value)}
                value={values.province}
              />
              <FieldError message={errors.province} name="province" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Kota/kabupaten
              <input
                aria-describedby={errors.cityOrRegency ? fieldErrorId("cityOrRegency") : undefined}
                aria-invalid={Boolean(errors.cityOrRegency)}
                className={fieldClass(errors.cityOrRegency)}
                name="cityOrRegency"
                onChange={(event) => updateValue("cityOrRegency", event.target.value)}
                value={values.cityOrRegency}
              />
              <FieldError message={errors.cityOrRegency} name="cityOrRegency" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Kecamatan
              <input
                aria-describedby={errors.district ? fieldErrorId("district") : undefined}
                aria-invalid={Boolean(errors.district)}
                className={fieldClass(errors.district)}
                name="district"
                onChange={(event) => updateValue("district", event.target.value)}
                value={values.district}
              />
              <FieldError message={errors.district} name="district" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Kode pos
              <input
                aria-describedby={errors.postalCode ? fieldErrorId("postalCode") : undefined}
                aria-invalid={Boolean(errors.postalCode)}
                className={fieldClass(errors.postalCode)}
                name="postalCode"
                onChange={(event) => updateValue("postalCode", event.target.value)}
                value={values.postalCode}
              />
              <FieldError message={errors.postalCode} name="postalCode" />
            </label>
          </div>
        </section>

        <section className="grid gap-4 border-b border-border pb-8">
          <h2 className="text-xl font-bold text-navy">3. Kontak darurat</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-navy">
              Nama kontak darurat
              <input
                aria-describedby={
                  errors.emergencyContactName ? fieldErrorId("emergencyContactName") : undefined
                }
                aria-invalid={Boolean(errors.emergencyContactName)}
                className={fieldClass(errors.emergencyContactName)}
                name="emergencyContactName"
                onChange={(event) => updateValue("emergencyContactName", event.target.value)}
                value={values.emergencyContactName}
              />
              <FieldError message={errors.emergencyContactName} name="emergencyContactName" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Nomor kontak darurat
              <input
                aria-describedby={
                  errors.emergencyContactPhone ? fieldErrorId("emergencyContactPhone") : undefined
                }
                aria-invalid={Boolean(errors.emergencyContactPhone)}
                className={fieldClass(errors.emergencyContactPhone)}
                name="emergencyContactPhone"
                onChange={(event) => updateValue("emergencyContactPhone", event.target.value)}
                value={values.emergencyContactPhone}
              />
              <FieldError message={errors.emergencyContactPhone} name="emergencyContactPhone" />
            </label>
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-bold text-navy">4. Persetujuan</h2>
          {[
            {
              checked: values.termsAccepted,
              error: errors.termsAccepted,
              label: "Saya menyetujui syarat dan ketentuan event.",
              name: "termsAccepted" as const,
            },
            {
              checked: values.privacyAccepted,
              error: errors.privacyAccepted,
              label:
                "Saya menyetujui kebijakan privasi dan penggunaan data untuk operasional event.",
              name: "privacyAccepted" as const,
            },
            {
              checked: values.dataStatementAccepted,
              error: errors.dataStatementAccepted,
              label: "Saya menyatakan data yang dikirim benar dan milik saya sendiri.",
              name: "dataStatementAccepted" as const,
            },
          ].map((item) => (
            <label
              className="flex min-h-11 items-start gap-3 text-sm text-foreground"
              key={item.name}
            >
              <input
                aria-describedby={item.error ? fieldErrorId(item.name) : undefined}
                aria-invalid={Boolean(item.error)}
                checked={item.checked}
                className="mt-1 h-5 w-5 accent-primary"
                name={item.name}
                onChange={(event) => updateChecked(item.name, event.target.checked)}
                type="checkbox"
              />
              <span>
                {item.label}
                <FieldError message={item.error} name={item.name} />
              </span>
            </label>
          ))}
          {!canBypassTurnstile && siteKey ? (
            <>
              <div
                aria-describedby={
                  errors.turnstileToken ? fieldErrorId("turnstileToken") : undefined
                }
                aria-invalid={Boolean(errors.turnstileToken)}
                className="cf-turnstile"
                data-sitekey={siteKey}
              />
              <FieldError message={errors.turnstileToken} name="turnstileToken" />
            </>
          ) : null}
          <SubmitButton />
        </section>
      </form>
    </>
  );
}
