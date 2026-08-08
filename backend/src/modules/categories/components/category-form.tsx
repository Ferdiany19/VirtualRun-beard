import type { EventCategoryRecord } from "@/modules/categories/category.types";
import { Field } from "@/modules/events/components/field";

type CategoryFormProps = {
  action: (formData: FormData) => Promise<void>;
  csrfToken: string;
  category?: EventCategoryRecord;
  submitLabel: string;
};

export function CategoryForm({ action, csrfToken, category, submitLabel }: CategoryFormProps) {
  return (
    <form action={action} className="grid gap-4">
      <input name="csrfToken" type="hidden" value={csrfToken} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field htmlFor={category ? `name-${category.id}` : "name"} label="Nama kategori">
          <input
            className="form-control"
            defaultValue={category?.name ?? ""}
            id={category ? `name-${category.id}` : "name"}
            name="name"
            required
          />
        </Field>
        <Field htmlFor={category ? `slug-${category.id}` : "slug"} label="Slug kategori">
          <input
            className="form-control"
            defaultValue={category?.slug ?? ""}
            id={category ? `slug-${category.id}` : "slug"}
            name="slug"
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            required
          />
        </Field>
      </div>
      <Field htmlFor={category ? `description-${category.id}` : "description"} label="Deskripsi">
        <textarea
          className="form-textarea min-h-24"
          defaultValue={category?.description ?? ""}
          id={category ? `description-${category.id}` : "description"}
          name="description"
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-4">
        <Field
          htmlFor={category ? `distance-${category.id}` : "distanceMeters"}
          label="Jarak meter"
        >
          <input
            className="form-control"
            defaultValue={category?.distanceMeters ?? ""}
            id={category ? `distance-${category.id}` : "distanceMeters"}
            min="1"
            name="distanceMeters"
            required
            type="number"
          />
        </Field>
        <Field
          htmlFor={category ? `tolerance-${category.id}` : "distanceToleranceMeters"}
          label="Toleransi meter"
        >
          <input
            className="form-control"
            defaultValue={category?.distanceToleranceMeters ?? 0}
            id={category ? `tolerance-${category.id}` : "distanceToleranceMeters"}
            min="0"
            name="distanceToleranceMeters"
            required
            type="number"
          />
        </Field>
        <Field htmlFor={category ? `display-${category.id}` : "displayOrder"} label="Urutan">
          <input
            className="form-control"
            defaultValue={category?.displayOrder ?? 0}
            id={category ? `display-${category.id}` : "displayOrder"}
            min="0"
            name="displayOrder"
            required
            type="number"
          />
        </Field>
        <Field
          htmlFor={category ? `quota-${category.id}` : "participantQuota"}
          label="Kuota peserta"
        >
          <input
            className="form-control"
            defaultValue={category?.participantQuota ?? ""}
            id={category ? `quota-${category.id}` : "participantQuota"}
            min="1"
            name="participantQuota"
            type="number"
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          htmlFor={category ? `minimumAge-${category.id}` : "minimumAgeYears"}
          label="Usia minimum"
        >
          <input
            className="form-control"
            defaultValue={category?.minimumAgeYears ?? ""}
            id={category ? `minimumAge-${category.id}` : "minimumAgeYears"}
            min="0"
            name="minimumAgeYears"
            type="number"
          />
        </Field>
        <Field
          htmlFor={category ? `maximumAge-${category.id}` : "maximumAgeYears"}
          label="Usia maksimum"
        >
          <input
            className="form-control"
            defaultValue={category?.maximumAgeYears ?? ""}
            id={category ? `maximumAge-${category.id}` : "maximumAgeYears"}
            min="0"
            name="maximumAgeYears"
            type="number"
          />
        </Field>
        <Field
          htmlFor={category ? `gender-${category.id}` : "genderDivision"}
          label="Gender division"
        >
          <select
            className="form-select"
            defaultValue={category?.genderDivision ?? ""}
            id={category ? `gender-${category.id}` : "genderDivision"}
            name="genderDivision"
          >
            <option value="">Tidak dibatasi</option>
            <option value="OPEN">Open</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="MIXED">Mixed</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            defaultChecked={category?.rankingEnabled ?? true}
            name="rankingEnabled"
            type="checkbox"
          />
          Ranking aktif
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            defaultChecked={category?.certificateEnabled ?? true}
            name="certificateEnabled"
            type="checkbox"
          />
          Sertifikat aktif
        </label>
      </div>
      <button className="min-h-11 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover sm:w-fit">
        {submitLabel}
      </button>
    </form>
  );
}
