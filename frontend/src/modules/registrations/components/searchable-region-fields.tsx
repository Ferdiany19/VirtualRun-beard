"use client";

import { useState } from "react";
import { SearchableRegionSelect } from "@/modules/registrations/components/searchable-region-select";

export function SearchableRegionFields() {
  const [province, setProvince] = useState("");
  const [provinceCode, setProvinceCode] = useState<string | undefined>();
  const [cityOrRegency, setCityOrRegency] = useState("");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <label className="grid gap-2 text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
        Provinsi
        <SearchableRegionSelect
          kind="province"
          onCodeChange={setProvinceCode}
          onChange={(value) => {
            setProvince(value);
            setCityOrRegency("");
          }}
          placeholder="Cari provinsi"
          value={province}
          variant="landing"
        />
      </label>
      <label className="grid gap-2 text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
        Kota/kabupaten
        <SearchableRegionSelect
          kind="regency"
          onChange={setCityOrRegency}
          placeholder="Cari kota/kabupaten"
          provinceCode={provinceCode}
          provinceValue={province}
          value={cityOrRegency}
          variant="landing"
        />
      </label>
    </div>
  );
}
