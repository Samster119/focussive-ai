interface PageHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-md mb-xl">
      <div className="flex items-center gap-md">
        <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            {title}
          </h1>
          {subtitle && (
            <p className="font-body-sm text-on-surface-variant">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-md">{actions}</div>}
    </header>
  );
}
