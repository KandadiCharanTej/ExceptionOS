import React from 'react';
import { cn } from '../lib/utils';
import { Activity, AlertCircle, HelpCircle, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

/* ─── Surface & Layout Containers ─── */
export function Surface({ className, children, hover, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/60 shadow-sm',
        hover && 'transition-all duration-300 hover:shadow-md hover:border-slate-300/80 hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Surface className={cn('overflow-hidden', className)} {...props}>{children}</Surface>;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn('text-base font-bold text-slate-900 tracking-tight', className)}>{children}</h3>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-6 text-slate-700', className)}>{children}</div>;
}

export function PageContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("max-w-[1400px] mx-auto px-5 md:px-8 xl:px-12 pb-16 pt-8", className)}>
      {children}
    </div>
  );
}

/* ─── Page & Section Headers ─── */
export function PageHeader({
  overline,
  title,
  description,
  badge,
  actions,
  className,
}: {
  overline?: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8', className)}>
      <div className="space-y-3">
        {overline && (
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">{overline}</p>
        )}
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-base text-slate-500 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-6", className)}>
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-1.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── Metric ─── */
export function Metric({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent';
  trend?: { direction: 'up' | 'down'; value: string; period?: string };
  className?: string;
}) {
  const variants = {
    default: 'text-slate-900',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
    accent: 'text-blue-600',
  };
  const iconBg = {
    default: 'bg-slate-50 text-slate-500 border-slate-200/60',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-600 border-amber-200/60',
    error: 'bg-red-50 text-red-600 border-red-200/60',
    accent: 'bg-blue-50 text-blue-600 border-blue-200/60',
  };

  return (
    <Surface className={cn('p-6 flex flex-col justify-between min-h-[140px]', className)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span>
        {Icon && (
          <div className={cn('p-2 rounded-xl border shadow-sm', iconBg[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      
      <div>
        <div className={cn('text-3xl font-extrabold tabular-nums tracking-tight mb-2', variants[variant])}>
          {value}
        </div>
        
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            {trend && (
              <span className={cn('font-bold flex items-center gap-0.5', trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500')}>
                {trend.direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {trend.value}
              </span>
            )}
            {trend?.period && <span>{trend.period}</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </Surface>
  );
}

export function MetricCard(props: Parameters<typeof Metric>[0]) {
  return <Metric {...props} />;
}

/* ─── Badges ─── */
export function Badge({
  children,
  variant = 'default',
  dot,
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' | 'indigo' | 'navy';
  dot?: boolean;
  className?: string;
}) {
  const variants = {
    default: 'bg-blue-50 text-blue-700 border-blue-200/60',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
    error: 'bg-red-50 text-red-700 border-red-200/60',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200/80',
    outline: 'border-slate-300 text-slate-700 bg-white',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    navy: 'bg-slate-900 text-white border-slate-800',
  };
  const dotColors = {
    default: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    secondary: 'bg-slate-500',
    outline: 'bg-slate-500',
    indigo: 'bg-indigo-500',
    navy: 'bg-white',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border', variants[variant], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string | null; className?: string }) {
  if (!status) return <Badge variant="secondary" dot className={className}>Unknown</Badge>;

  const map: Record<string, { v: 'default' | 'success' | 'warning' | 'error' | 'secondary' | 'indigo'; l: string }> = {
    NO_EXCEPTION: { v: 'success', l: 'Healthy' },
    MATCHED: { v: 'success', l: 'Matched' },
    matched: { v: 'success', l: 'Matched' },
    CONFIRMED: { v: 'error', l: 'Confirmed' },
    VERIFIED_RESOLVED: { v: 'success', l: 'Resolved' },
    RESOLVED: { v: 'success', l: 'Resolved' },
    STILL_OPEN: { v: 'warning', l: 'Open' },
    OPEN: { v: 'warning', l: 'Open' },
    PENDING: { v: 'warning', l: 'Pending' },
    NEEDS_REVIEW: { v: 'indigo', l: 'Needs Review' },
    RECORDED: { v: 'default', l: 'Recorded' },
    COMPLETED: { v: 'success', l: 'Completed' },
    FAILED: { v: 'error', l: 'Failed' },
    INVESTIGATION: { v: 'warning', l: 'Investigation' },
    UNRESOLVED: { v: 'warning', l: 'Unresolved' },
    CRITICAL: { v: 'error', l: 'Critical' },
    HIGH_RISK: { v: 'error', l: 'High Risk' },
    duplicate_detected: { v: 'error', l: 'Duplicate' },
    amount_mismatch: { v: 'warning', l: 'Amount Mismatch' },
    date_mismatch: { v: 'warning', l: 'Date Mismatch' },
    missing_in_ledger: { v: 'error', l: 'Missing Ledger' },
    missing_in_gateway: { v: 'error', l: 'Missing Gateway' },
    missing_in_bank: { v: 'error', l: 'Missing Bank' },
    system_error: { v: 'error', l: 'System Error' },
  };

  const key = status.toUpperCase().replace(/ /g, '_');
  const mapped = map[status] || map[key] || { v: 'secondary' as const, l: status.replace(/_/g, ' ') };
  return <Badge variant={mapped.v} dot className={className}>{mapped.l}</Badge>;
}

export function PriorityBadge({ priority, className }: { priority?: string | null; className?: string }) {
  if (!priority) return null;
  const p = priority.toUpperCase();
  if (p === 'CRITICAL') return <Badge variant="error" dot className={className}>Critical</Badge>;
  if (p === 'HIGH') return <Badge variant="warning" dot className={className}>High</Badge>;
  if (p === 'MEDIUM') return <Badge variant="indigo" dot className={className}>Medium</Badge>;
  return <Badge variant="secondary" dot className={className}>Low</Badge>;
}

/* ─── Intelligence Card ─── */
export function IntelligenceCard({
  insight,
  detail,
  recommendation,
  action,
  className,
}: {
  insight: string;
  detail?: string;
  recommendation?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-[#0F172A] rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-slate-900/10', className)}>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-indigo-400 text-lg">✦</span>
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">AI Intelligence</span>
      </div>
      <p className="text-lg md:text-xl font-bold leading-relaxed mb-3">{insight}</p>
      {detail && <p className="text-base text-slate-400 leading-relaxed mb-6">{detail}</p>}
      
      {(recommendation || action) && (
        <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {recommendation && (
            <p className="text-sm font-medium text-slate-300">
              <span className="text-slate-500 uppercase tracking-wider text-xs font-bold mr-2">Action:</span>
              {recommendation}
            </p>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </div>
  );
}

/* ─── Attention Item ─── */
export function AttentionItem({
  priority,
  title,
  count,
  subtitle,
  onAction,
  actionLabel = 'Investigate',
}: {
  priority: 'critical' | 'high' | 'medium';
  title: string;
  count: string | number;
  subtitle: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const styles = {
    critical: { dot: 'bg-red-500', label: 'Critical', border: 'border-l-4 border-l-red-500' },
    high: { dot: 'bg-amber-500', label: 'High', border: 'border-l-4 border-l-amber-500' },
    medium: { dot: 'bg-blue-500', label: 'Review', border: 'border-l-4 border-l-blue-500' },
  };
  const s = styles[priority];

  return (
    <div className={cn('px-6 py-5 border-b border-slate-100 last:border-b-0 bg-white hover:bg-slate-50 transition-colors group', s.border)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn('w-2 h-2 rounded-full shrink-0', s.dot)} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{s.label}</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
          <p className="text-sm text-slate-500 font-medium">
            <span className="font-bold text-slate-700 tabular-nums">{typeof count === 'number' ? count.toLocaleString() : count}</span>
            <span className="mx-2 text-slate-300">•</span>
            {subtitle}
          </p>
        </div>
        {onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors shrink-0 cursor-pointer bg-blue-50 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100"
          >
            {actionLabel} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Buttons ─── */
const btnBase = "inline-flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer px-5 py-2.5";

export function PrimaryButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        btnBase,
        'bg-[#0F172A] hover:bg-slate-800 active:bg-slate-900 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        btnBase,
        'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-sm hover:shadow hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        btnBase,
        'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        btnBase,
        'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md hover:shadow-red-600/20 hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── States ─── */
export function EmptyState({ icon: Icon = HelpCircle, title, description, action, className }: {
  icon?: React.ElementType; title: string; description: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50", className)}>
      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 mb-6">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="text-base text-slate-500 max-w-md mt-3 mb-8 leading-relaxed font-medium">{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[300px]">
      <Activity className="h-8 w-8 text-blue-600 animate-spin mb-4" />
      <p className="text-base font-bold text-slate-500 animate-pulse">{message}</p>
    </div>
  );
}

export function ErrorState({ title = 'Failed to load', message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <Surface className="p-8 border-red-200 bg-red-50/50">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
        <div>
          <h4 className="text-lg font-bold text-red-900 mb-2">{title}</h4>
          {message && <p className="text-sm font-medium text-red-700/80 mb-4">{message}</p>}
          {onRetry && (
            <DangerButton onClick={onRetry}>
              Try Again
            </DangerButton>
          )}
        </div>
      </div>
    </Surface>
  );
}

/* ─── Chart Container ─── */
export function ChartContainer({ title, icon: Icon, action, children, className }: {
  title: string; icon?: React.ElementType; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Surface className={cn("overflow-hidden flex flex-col", className)}>
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-blue-600" />}
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6 flex-1 bg-white">{children}</div>
    </Surface>
  );
}

/* ─── System Status ─── */
export function SystemStatus({ healthy, label }: { healthy: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-white border border-slate-200/80 shadow-sm transition-colors hover:bg-slate-50 cursor-default">
      <span className="relative flex h-2.5 w-2.5">
        {healthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}
        <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', healthy ? 'bg-emerald-500' : 'bg-red-500')} />
      </span>
      <span className="text-sm font-bold text-slate-700">{label || (healthy ? 'System Operational' : 'System Offline')}</span>
    </div>
  );
}
