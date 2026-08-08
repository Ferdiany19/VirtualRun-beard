type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <h3 className="text-base font-bold text-navy">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">{description}</p>
    </div>
  );
}
