import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon: Icon, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4", className)}>
      <div className="grid gap-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-8 w-8 text-primary" />}
          <h1 className="text-2xl md:text-3xl font-title tracking-tight text-gray-900">{title}</h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex items-center gap-2 w-full md:w-auto">{children}</div>}
    </div>
  );
}
