type FieldProps = {
  label: string;
  htmlFor: string;
  description?: string;
  children: React.ReactNode;
};

export function Field({ label, htmlFor, description, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-bold text-navy" htmlFor={htmlFor}>
        {label}
      </label>
      <div>{children}</div>
      {description ? (
        <p className="text-xs leading-5 text-foreground-muted">{description}</p>
      ) : null}
    </div>
  );
}
