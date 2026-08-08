import Link from "next/link";
import { Icon } from "@/shared/ui/icons";

type BrandLogoProps = {
  href?: string;
  inverted?: boolean;
  compact?: boolean;
};

export function BrandLogo({ href = "/", inverted = false, compact = false }: BrandLogoProps) {
  const content = (
    <span className="inline-flex min-h-11 items-center gap-2.5">
      <span
        className={[
          "inline-flex h-9 w-9 items-center justify-center rounded-app",
          inverted ? "bg-white text-primary" : "bg-primary text-white",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" name="runner" />
      </span>
      {compact ? null : (
        <span className={inverted ? "text-white" : "text-navy"}>
          <span className="text-lg font-bold leading-none">VirtualRun</span>
          <span className="ml-1 text-lg font-bold leading-none text-primary">Beard</span>
        </span>
      )}
    </span>
  );

  return (
    <Link aria-label="VirtualRun Beard" className="inline-flex items-center" href={href}>
      {content}
    </Link>
  );
}
