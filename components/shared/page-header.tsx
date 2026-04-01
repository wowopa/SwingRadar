interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
      <div className="space-y-1.5">
        <h2 className="text-3xl font-semibold leading-tight text-foreground sm:text-[2.35rem]">{title}</h2>
        {description ? <p className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
      </div>
    </div>
  );
}
