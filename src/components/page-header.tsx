import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
      <div className="grid gap-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-8 w-8 text-primary font-light" />}
          <h1 className="text-2xl md:text-3xl font-light tracking-tight text-gray-900">{title}</h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex items-center gap-2 w-full md:w-auto">{children}</div>}
    </div>
  );
}
