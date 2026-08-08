import { PublicSectionTitle } from "@/modules/events/components/public-section-title";
import { Icon, type IconName } from "@/shared/ui/icons";

const steps: Array<{
  title: string;
  description: string;
  icon: IconName;
}> = [
  {
    title: "Daftar Event",
    description: "Pilih event, isi data diri, dan ikuti instruksi pendaftaran.",
    icon: "clipboard",
  },
  {
    title: "Terima Email & BIB",
    description: "Kamu akan menerima email konfirmasi dan nomor BIB secara otomatis.",
    icon: "mail",
  },
  {
    title: "Lari & Simpan Bukti",
    description: "Lakukan lari sesuai jarak yang dipilih dan simpan bukti aktivitasmu.",
    icon: "runner",
  },
  {
    title: "Upload Hasil",
    description: "Upload bukti lari melalui situs kapan saja selama periode event berlangsung.",
    icon: "upload",
  },
];

type HowItWorksProps = {
  compact?: boolean;
};

export function HowItWorks({ compact = false }: HowItWorksProps) {
  return (
    <section id="cara-kerja" className={compact ? "" : "bg-surface py-12"}>
      <div className={compact ? "" : "app-container"}>
        {!compact ? <PublicSectionTitle title="Cara Kerja" /> : null}
        <ol
          className={[
            compact ? "mt-4" : "mt-8",
            "grid",
            compact ? "gap-4 sm:grid-cols-2" : "gap-8 md:grid-cols-4",
          ].join(" ")}
        >
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-app border border-border bg-surface px-4 py-5 text-center shadow-soft"
            >
              {!compact && index < steps.length - 1 ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute left-[calc(100%+6px)] top-1/2 z-10 hidden h-px w-5 border-t border-dashed border-foreground-muted/50 md:block"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-[calc(100%+25px)] top-1/2 z-10 hidden h-2 w-2 -translate-y-1/2 rotate-45 border-r border-t border-foreground-muted/50 md:block"
                  />
                </>
              ) : null}
              <span className="absolute left-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {index + 1}
              </span>
              <div className="mx-auto flex h-11 w-11 items-center justify-center text-primary">
                <Icon className="h-10 w-10" name={step.icon} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-navy">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-[10rem] text-xs leading-5 text-foreground-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
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
