import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  inverted?: boolean;
  compact?: boolean;
};

export function BrandLogo({ href = "/", inverted = false, compact = false }: BrandLogoProps) {
  const logoSrc = inverted
    ? "/assets/logo/BEARD NEW LOGO WHITE.png"
    : "/assets/logo/BEARD NEW LOGO BLACK.png";

  return (
    <Link aria-label="VirtualRun Beard" className="inline-flex min-h-11 items-center" href={href}>
      <span
        className={
          compact
            ? "inline-flex h-8 w-8 shrink-0 overflow-hidden"
            : "inline-flex h-8 w-[139px] shrink-0"
        }
      >
        <Image
          alt=""
          className="block h-8 w-[139px] max-w-none shrink-0 object-contain"
          height={32}
          sizes="139px"
          src={logoSrc}
          width={139}
        />
      </span>
    </Link>
  );
}
