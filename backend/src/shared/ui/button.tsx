import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "action" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white border-primary hover:bg-primary-hover",
  secondary: "bg-surface text-foreground border-border hover:border-primary hover:text-primary",
  action: "bg-action text-white border-action hover:bg-action-hover",
  danger: "bg-surface text-danger border-red-200 hover:border-danger",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-app border px-4 py-2 text-sm font-semibold transition-colors",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    />
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
};

export function ButtonLink({
  className = "",
  href,
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-app border px-4 py-2 text-sm font-semibold transition-colors",
        variantClasses[variant],
        className,
      ].join(" ")}
      href={href}
      {...props}
    />
  );
}
