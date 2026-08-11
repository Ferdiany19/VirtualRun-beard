/* Hallmark · component: datepicker · genre: editorial · theme: Sport
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46-50)
 */
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/shared/ui/icons";

type DatePickerInputProps = {
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  defaultValue?: string;
  disabled?: boolean;
  max?: string;
  min?: string;
  name: string;
  onChange?: (value: string) => void;
  required?: boolean;
  value?: string;
};

const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthName(month: number): string {
  return new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2020, month, 1));
}

function yearOptions(min?: string, max?: string): number[] {
  const currentYear = new Date().getFullYear();
  const minimum = min ? Number(min.slice(0, 4)) : currentYear - 120;
  const maximum = max ? Number(max.slice(0, 4)) : currentYear;
  const start = Number.isFinite(minimum) ? minimum : currentYear - 120;
  const end = Number.isFinite(maximum) ? maximum : currentYear;

  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => end - index);
}

function displayValue(value: string): string {
  const date = parseIsoDate(value);

  if (!date) {
    return "Pilih tanggal";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function sameDay(left: Date, right: Date): boolean {
  return toIsoDate(left) === toIsoDate(right);
}

function isOutsideRange(date: Date, min?: string, max?: string): boolean {
  const value = toIsoDate(date);

  return Boolean((min && value < min) || (max && value > max));
}

function buildMonthDays(month: Date): Array<Date | null> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: first.getDay() }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function DatePickerInput({
  ariaDescribedBy,
  ariaInvalid,
  defaultValue = "",
  disabled = false,
  max,
  min,
  name,
  onChange,
  required,
  value,
}: DatePickerInputProps) {
  const generatedId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = isControlled ? (value ?? "") : internalValue;
  const selectedDate = parseIsoDate(selectedValue);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate ?? parseIsoDate(defaultValue) ?? parseIsoDate(todayIso()) ?? new Date(),
  );

  useEffect(() => {
    const nextDate = parseIsoDate(selectedValue);
    if (nextDate) {
      setVisibleMonth(nextDate);
    }
  }, [selectedValue]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const days = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const years = useMemo(() => yearOptions(min, max), [max, min]);

  function commit(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
    setOpen(false);
  }

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function changeMonth(month: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), month, 1));
  }

  function changeYear(year: number) {
    setVisibleMonth((current) => new Date(year, current.getMonth(), 1));
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <input name={name} required={required} type="hidden" value={selectedValue} readOnly />
      <button
        aria-describedby={ariaDescribedBy}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-invalid={ariaInvalid}
        className={[
          "landing-action flex min-h-12 w-full items-center justify-between gap-3 border-2 bg-[var(--color-landing-white)] px-4 text-left text-sm font-bold text-[var(--color-landing-ink)] transition-colors duration-[var(--dur-short)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px disabled:cursor-not-allowed disabled:border-[var(--color-landing-rule)] disabled:bg-[var(--color-landing-paper-2)] disabled:text-[var(--color-landing-ink-2)]",
          ariaInvalid
            ? "border-danger hover:border-danger"
            : "border-[var(--color-landing-ink)] hover:border-[var(--color-landing-orange)]",
        ].join(" ")}
        disabled={disabled}
        id={`${generatedId}-button`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{displayValue(selectedValue)}</span>
        <Icon className="h-4 w-4 shrink-0" name="calendar" />
      </button>

      {open ? (
        <div
          aria-labelledby={`${generatedId}-button`}
          className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[90vw] border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)] p-3 text-[var(--color-landing-ink)] shadow-soft"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              aria-label="Bulan sebelumnya"
              className="landing-action inline-flex h-10 w-10 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
              onClick={() => moveMonth(-1)}
              type="button"
            >
              <Icon className="h-4 w-4" name="chevron-left" />
            </button>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <label className="sr-only" htmlFor={`${generatedId}-month`}>
                Pilih bulan
              </label>
              <select
                className="min-h-10 min-w-0 border border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] px-2 text-xs font-bold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]"
                id={`${generatedId}-month`}
                onChange={(event) => changeMonth(Number(event.target.value))}
                value={visibleMonth.getMonth()}
              >
                {Array.from({ length: 12 }, (_, month) => (
                  <option key={month} value={month}>
                    {monthName(month)}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor={`${generatedId}-year`}>
                Pilih tahun
              </label>
              <select
                className="min-h-10 min-w-0 border border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]"
                id={`${generatedId}-year`}
                onChange={(event) => changeYear(Number(event.target.value))}
                value={visibleMonth.getFullYear()}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              aria-label="Bulan berikutnya"
              className="landing-action inline-flex h-10 w-10 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
              onClick={() => moveMonth(1)}
              type="button"
            >
              <Icon className="h-4 w-4" name="chevron-right" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 border-y border-[var(--color-landing-rule)] py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
            {dayLabels.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) {
                return <span aria-hidden="true" key={`blank-${index}`} />;
              }

              const iso = toIsoDate(day);
              const selected = selectedDate ? sameDay(day, selectedDate) : false;
              const today = sameDay(day, new Date());
              const outOfRange = isOutsideRange(day, min, max);

              return (
                <button
                  aria-pressed={selected}
                  className={[
                    "landing-action flex h-10 items-center justify-center border text-sm font-bold transition-colors duration-[var(--dur-short)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35",
                    selected
                      ? "border-[var(--color-landing-ink)] bg-[var(--color-landing-orange)] text-[var(--color-landing-ink)]"
                      : today
                        ? "border-[var(--color-landing-teal-dark)] bg-[var(--color-landing-paper-2)] text-[var(--color-landing-ink)]"
                        : "border-transparent bg-[var(--color-landing-white)] text-[var(--color-landing-ink)] hover:border-[var(--color-landing-ink)]",
                  ].join(" ")}
                  disabled={outOfRange}
                  key={iso}
                  onClick={() => commit(iso)}
                  type="button"
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-landing-rule)] pt-3">
            <button
              className="landing-action inline-flex min-h-10 items-center border border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] px-3 text-xs font-bold text-[var(--color-landing-ink)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]"
              onClick={() => commit(todayIso())}
              type="button"
            >
              Hari ini
            </button>
            <button
              className="landing-action inline-flex min-h-10 items-center border border-[var(--color-landing-rule)] bg-transparent px-3 text-xs font-bold text-[var(--color-landing-ink-2)] hover:border-[var(--color-landing-ink)] hover:text-[var(--color-landing-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]"
              onClick={() => commit("")}
              type="button"
            >
              Kosongkan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
