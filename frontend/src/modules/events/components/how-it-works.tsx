const steps: Array<{
  title: string;
  description: string;
  illustration: "phone" | "package" | "run" | "upload";
}> = [
  {
    title: "Pilih Event",
    description: "Pilih event dan kategori jarak yang ingin kamu ikuti.",
    illustration: "phone",
  },
  {
    title: "Dapatkan BIB",
    description: "Nomor BIB dikirim melalui email setelah pendaftaran berhasil.",
    illustration: "package",
  },
  {
    title: "Lari & Rekam",
    description: "Selesaikan lari sesuai kategori dan rekam aktivitasmu.",
    illustration: "run",
  },
  {
    title: "Upload Hasil",
    description: "Upload bukti lari melalui situs kapan saja selama periode event berlangsung.",
    illustration: "upload",
  },
];

type HowItWorksProps = {
  compact?: boolean;
};

function StepConnector() {
  return (
    <svg
      aria-hidden="true"
      className="absolute -right-14 top-20 z-10 hidden h-4 w-24 text-[var(--color-landing-ink)]/40 lg:block"
      fill="none"
      viewBox="0 0 96 16"
    >
      <path d="M4 8h78" stroke="currentColor" strokeDasharray="4 6" strokeLinecap="round" />
      <path d="m78 3 7 5-7 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepIllustration({ name }: { name: (typeof steps)[number]["illustration"] }) {
  if (name === "phone") {
    return (
      <svg aria-hidden="true" className="h-24 w-24" fill="none" viewBox="0 0 112 112">
        <rect
          x="18"
          y="22"
          width="76"
          height="68"
          rx="5"
          fill="var(--color-landing-paper-2)"
          stroke="var(--color-landing-ink)"
          strokeWidth="4"
        />
        <path
          d="M18 40h76M35 14v16M77 14v16"
          stroke="var(--color-landing-ink)"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="m38 64 11 11 25-29"
          stroke="var(--color-landing-teal)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="7"
        />
      </svg>
    );
  }

  if (name === "package") {
    return (
      <svg aria-hidden="true" className="h-24 w-28" fill="none" viewBox="0 0 128 112">
        <path d="M24 36 58 18l36 18-36 18-34-18Z" fill="var(--color-landing-teal)" opacity=".45" />
        <path d="M24 36v42l34 18V54L24 36Z" fill="var(--color-landing-paper-2)" />
        <path d="M94 36v42L58 96V54l36-18Z" fill="var(--color-landing-teal)" opacity=".35" />
        <path d="M47 24 82 42v17l-13-6-12 8V44L35 31l12-7Z" fill="var(--color-landing-teal)" />
        <rect
          x="54"
          y="56"
          width="58"
          height="28"
          rx="4"
          fill="var(--color-landing-white)"
          stroke="var(--color-landing-teal)"
          strokeWidth="3"
        />
        <rect x="60" y="62" width="22" height="8" rx="2" fill="var(--color-landing-teal)" />
        <path
          d="M88 65h15M64 77h34"
          stroke="var(--color-landing-ink)"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
    );
  }

  if (name === "run") {
    return (
      <svg aria-hidden="true" className="h-24 w-28" fill="none" viewBox="0 0 128 112">
        <path
          d="M89 78c12-10 19-19 19-28a16 16 0 0 0-32 0c0 9 7 18 13 28Z"
          fill="var(--color-landing-teal)"
          opacity=".35"
        />
        <circle cx="92" cy="50" r="5" fill="var(--color-landing-teal)" />
        <circle cx="61" cy="24" r="8" fill="var(--color-landing-ink)" />
        <path
          d="m57 36-12 21 20 9 13 25"
          stroke="var(--color-landing-teal)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="8"
        />
        <path
          d="m45 57-21 9M64 66l26-12M49 77 35 94M78 91l19 10"
          stroke="var(--color-landing-ink)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="8"
        />
        <path
          d="M23 98h82"
          stroke="var(--color-landing-rule)"
          strokeLinecap="round"
          strokeWidth="5"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-24 w-24" fill="none" viewBox="0 0 112 112">
      <path
        d="M22 78h68v18H22V78Z"
        fill="var(--color-landing-paper-2)"
        stroke="var(--color-landing-ink)"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M56 76V20M37 39l19-19 19 19"
        stroke="var(--color-landing-teal)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
      <circle cx="79" cy="87" r="4" fill="var(--color-landing-orange)" />
    </svg>
  );
}

export function HowItWorks({ compact = false }: HowItWorksProps) {
  return (
    <section
      id="cara-kerja"
      className={compact ? "" : "bg-[var(--color-landing-white)] py-16 sm:py-20 lg:py-24"}
    >
      <div className={compact ? "" : "app-container"}>
        <div>
          {!compact ? (
            <div className="grid gap-6 border-b-[3px] border-[var(--color-landing-ink)] pb-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)] lg:items-end">
              <h2 className="landing-display landing-section-title max-w-[8ch] text-[var(--color-landing-ink)]">
                Cara kerja.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[var(--color-landing-ink-2)] lg:justify-self-end">
                Empat tahap dari memilih event sampai mengirim bukti aktivitas. Seluruh proses
                dilakukan secara online.
              </p>
            </div>
          ) : null}
          <ol
            className={[
              compact ? "mt-4" : "mt-8",
              "grid",
              compact ? "gap-4 sm:grid-cols-2" : "gap-0 sm:grid-cols-2 lg:grid-cols-4",
            ].join(" ")}
          >
            {steps.map((step, index) => (
              <li
                key={step.title}
                className={[
                  "relative text-left",
                  compact
                    ? "rounded-app border border-border bg-surface px-4 py-5 shadow-soft"
                    : "border-b border-[var(--color-landing-rule)] py-7 sm:px-5 sm:first:pl-0 lg:border-b-0 lg:border-r lg:last:border-r-0",
                ].join(" ")}
              >
                {!compact && index < steps.length - 1 ? <StepConnector /> : null}
                <span
                  className={
                    compact
                      ? "mx-auto mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
                      : "landing-display block text-4xl leading-none text-[var(--color-landing-orange)]"
                  }
                >
                  {compact ? index + 1 : `0${index + 1}`}
                </span>
                <div
                  className={
                    compact
                      ? "mx-auto flex h-28 items-center justify-center"
                      : "flex h-32 items-center justify-start"
                  }
                >
                  <StepIllustration name={step.illustration} />
                </div>
                <h3
                  className={
                    compact
                      ? "mt-1 text-sm font-bold text-navy"
                      : "landing-display mt-1 text-2xl leading-none text-[var(--color-landing-ink)]"
                  }
                >
                  {step.title}
                </h3>
                <p
                  className={
                    compact
                      ? "mx-auto mt-2 max-w-[12.5rem] text-xs leading-5 text-foreground-muted"
                      : "mt-3 max-w-[15rem] text-xs leading-5 text-[var(--color-landing-ink-2)]"
                  }
                >
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
        {compact ? (
          <div className="mt-4 grid gap-3 rounded-app border border-border bg-surface-muted p-4 text-sm text-foreground-muted sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                5
              </span>
              <p>Tunggu validasi admin setelah hasil dikirim.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                6
              </span>
              <p>Unduh sertifikat saat modul sertifikat sudah tersedia.</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
