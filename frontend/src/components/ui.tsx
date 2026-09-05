import React from 'react';
import { cn } from '../App';
import { Activity, AlertCircle, HelpCircle } from 'lucide-react';

// Card Components
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300 hover:shadow-md", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <h3 className={cn("text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("p-6 text-slate-700", className)}>
      {children}
    </div>
  );
}

// Badge Component
export function Badge({ 
  children, 
  variant = 'default',
  className
}: { 
  children: React.ReactNode, 
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' | 'indigo' | 'purple',
  className?: string 
}) {
  const variants = {
    default: "bg-blue-50 text-blue-700 border border-blue-200/80",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/80",
    error: "bg-red-50 text-red-700 border border-red-200/80",
    secondary: "bg-slate-100 text-slate-700 border border-slate-200/80",
    outline: "border border-slate-200 text-slate-700 bg-white",
    indigo: "bg-indigo-50 text-indigo-700 border border-indigo-200/80",
    purple: "bg-purple-50 text-purple-700 border border-purple-200/80",
  };
  
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider", variants[variant], className)}>
      {children}
    </span>
  );
}

// Status Badges
export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  
  const map: Record<string, { v: 'default' | 'success' | 'warning' | 'error' | 'secondary' | 'indigo' | 'purple', l: string }> = {
    'NO_EXCEPTION': { v: 'success', l: 'Healthy' },
    'MATCHED': { v: 'success', l: 'Matched' },
    'CONFIRMED': { v: 'error', l: 'Confirmed' },
    'VERIFIED_RESOLVED': { v: 'success', l: 'Resolved' },
    'STILL_OPEN': { v: 'warning', l: 'Open' },
    'PENDING': { v: 'warning', l: 'Pending' },
    'NEEDS_REVIEW': { v: 'indigo', l: 'Needs Review' },
    'RECORDED': { v: 'default', l: 'Recorded' },
    'COMPLETED': { v: 'success', l: 'Completed' },
    'FAILED': { v: 'error', l: 'Failed' },
    'INVESTIGATION': { v: 'warning', l: 'Investigation' },
    'UNRESOLVED': { v: 'warning', l: 'Unresolved' },
    'CRITICAL': { v: 'error', l: 'Critical' },
    'HIGH_RISK': { v: 'error', l: 'High Risk' }
  };
  
  const normalizedKey = status.toUpperCase().replace(' ', '_');
  const mapped = map[normalizedKey] || map[status] || { v: 'secondary', l: status.replace('_', ' ') };
  return <Badge variant={mapped.v}>{mapped.l}</Badge>;
}

// Priority Badges
export function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return null;
  const p = priority.toUpperCase();
  if (p === 'CRITICAL') return <Badge variant="error">Critical</Badge>;
  if (p === 'HIGH') return <Badge variant="warning">High Priority</Badge>;
  if (p === 'MEDIUM') return <Badge variant="indigo">Medium Priority</Badge>;
  return <Badge variant="secondary">Low Priority</Badge>;
}

// Page Header
export function PageHeader({ 
  title, 
  subtitle, 
  badge,
  actions 
}: { 
  title: string; 
  subtitle?: string; 
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// Metric Card Component
export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'indigo';
  trend?: string;
}) {
  const iconColors = {
    default: "text-blue-600 bg-blue-50 border-blue-100",
    success: "text-emerald-600 bg-emerald-50 border-emerald-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    error: "text-red-600 bg-red-50 border-red-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && (
          <div className={cn("p-2 rounded-lg border", iconColors[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center text-xs text-slate-500 font-medium">
          {trend && <span className="text-emerald-600 font-semibold mr-1.5">{trend}</span>}
          <span>{subtitle}</span>
        </div>
      )}
    </Card>
  );
}

// Empty State
export function EmptyState({
  icon: Icon = HelpCircle,
  title,
  description,
  action
}: {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-slate-300 rounded-xl">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4 border border-slate-200">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">{description}</p>
      {action}
    </div>
  );
}

// Loading State
export function LoadingState({ message = "Loading financial data..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500 min-h-[250px]">
      <Activity className="h-8 w-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

// Error State
export function ErrorState({ title = "Failed to load data", message, onRetry }: { title?: string, message?: string, onRetry?: () => void }) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-900">{title}</h4>
          {message && <p className="text-xs text-red-700 mt-1">{message}</p>}
          {onRetry && (
            <button 
              onClick={onRetry}
              className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              Retry Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Button Components
export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "px-4 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 text-sm font-medium rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
