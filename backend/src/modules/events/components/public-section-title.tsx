type PublicSectionTitleProps = {
  title: string;
  align?: "center" | "left";
};

export function PublicSectionTitle({ title, align = "center" }: PublicSectionTitleProps) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <h2 className="text-2xl font-bold leading-tight text-navy sm:text-3xl">{title}</h2>
      <span
        className={["mt-2 block h-0.5 w-12 bg-primary", align === "center" ? "mx-auto" : ""].join(
          " ",
        )}
      />
    </div>
  );
}
