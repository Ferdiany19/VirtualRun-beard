"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type RegionOption = { code: string; name: string };
type RegionKind = "province" | "regency";
type RegionVariant = "standard" | "landing";

type SearchableRegionSelectProps = {
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  disabled?: boolean;
  kind: RegionKind;
  onCodeChange?: (code: string | undefined) => void;
  onChange?: (value: string) => void;
  placeholder: string;
  provinceCode?: string;
  provinceValue?: string;
  value: string;
  variant?: RegionVariant;
};

function inputClass(variant: RegionVariant, invalid: boolean): string {
  if (variant === "landing") {
    return [
      "min-h-11 w-full border-2 bg-[var(--color-landing-white)] px-3 text-sm text-[var(--color-landing-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]",
      invalid
        ? "border-danger focus-visible:border-danger"
        : "border-[var(--color-landing-ink)] focus-visible:border-[var(--color-landing-orange)]",
    ].join(" ");
  }

  return [
    "min-h-11 w-full rounded-app border px-3 text-foreground focus:outline-none",
    invalid ? "border-danger focus:border-danger" : "border-border focus:border-primary",
  ].join(" ");
}

function endpoint(kind: RegionKind, provinceCode?: string): string | null {
  if (kind === "province") return "/api/public/regions/provinces";
  return provinceCode ? `/api/public/regions/regencies/${provinceCode}` : null;
}

export function SearchableRegionSelect({
  ariaDescribedBy,
  ariaInvalid,
  disabled = false,
  kind,
  onCodeChange,
  onChange,
  placeholder,
  provinceCode: selectedProvinceCode,
  provinceValue,
  value,
  variant = "standard",
}: SearchableRegionSelectProps) {
  const generatedId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [selectedValue, setSelectedValue] = useState(value);
  const [options, setOptions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    setQuery(value);
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (kind === "regency" && !provinceValue) {
      setOptions([]);
      setLoadError(false);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const url = endpoint(kind, selectedProvinceCode);

        if (!url) {
          setOptions([]);
          return;
        }

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("region request failed");
        const payload = (await response.json()) as { data?: RegionOption[] };
        setOptions(Array.isArray(payload.data) ? payload.data : []);
        if (kind === "province" && value) {
          onCodeChange?.(payload.data?.find((option) => option.name === value)?.code);
        }
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
    // Province options are loaded by this same component; the parent value is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, onCodeChange, retryNonce, selectedProvinceCode, provinceValue]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.name.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  function selectOption(option: RegionOption) {
    setQuery(option.name);
    setSelectedValue(option.name);
    if (kind === "province") onCodeChange?.(option.code);
    onChange?.(option.name);
    setOpen(false);
  }

  const disabledMessage = kind === "regency" && !provinceValue;

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        name={kind === "province" ? "province" : "cityOrRegency"}
        readOnly
        type="hidden"
        value={selectedValue}
      />
      <input
        aria-autocomplete="list"
        aria-controls={`${generatedId}-listbox`}
        aria-describedby={ariaDescribedBy}
        aria-expanded={open}
        aria-invalid={ariaInvalid}
        aria-label={placeholder}
        className={inputClass(variant, Boolean(ariaInvalid))}
        disabled={disabled || disabledMessage}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedValue("");
          setOpen(true);
          if (event.target.value !== value) onChange?.("");
        }}
        onFocus={() => setOpen(true)}
        placeholder={disabledMessage ? "Pilih provinsi terlebih dahulu" : placeholder}
        role="combobox"
        value={query}
      />
      {open && !disabled && !disabledMessage ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-app border border-border bg-surface p-1 shadow-soft"
          id={`${generatedId}-listbox`}
          role="listbox"
        >
          {loading ? <p className="p-3 text-xs text-foreground-muted">Memuat data wilayah...</p> : null}
          {loadError ? (
            <button
              className="min-h-11 w-full px-3 text-left text-xs font-bold text-danger hover:bg-surface-muted"
              onClick={() => {
                setRetryNonce((current) => current + 1);
                setOpen(true);
              }}
              type="button"
            >
              Data wilayah belum tersedia. Coba lagi.
            </button>
          ) : null}
          {!loading && !loadError && filteredOptions.length === 0 ? (
            <p className="p-3 text-xs text-foreground-muted">Wilayah tidak ditemukan.</p>
          ) : null}
          {!loading && !loadError
            ? filteredOptions.map((option) => (
                <button
                  className="min-h-11 w-full rounded-app px-3 text-left text-sm text-navy hover:bg-surface-muted focus:bg-surface-muted focus:outline-none"
                  key={option.code}
                  onClick={() => selectOption(option)}
                  role="option"
                  type="button"
                >
                  {option.name}
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
