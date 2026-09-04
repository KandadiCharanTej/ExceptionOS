import React from 'react';
import { cn } from '../App';

export function Card({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("px-6 py-5 border-b border-border bg-slate-900/20", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <h3 className={cn("text-lg font-semibold text-card-foreground tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("p-6 text-card-foreground", className)}>
      {children}
    </div>
  );
}

export function Badge({ 
  children, 
  variant = 'default',
  className
}: { 
  children: React.ReactNode, 
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary',
  className?: string 
}) {
  const variants = {
    default: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    error: "bg-red-500/10 text-red-400 border border-red-500/20",
    secondary: "bg-slate-800 text-slate-300 border border-slate-700",
    outline: "border border-border text-foreground bg-transparent"
  };
  
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider", variants[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  
  const map: Record<string, any> = {
    'NO_EXCEPTION': { v: 'success', l: 'No Exception' },
    'CONFIRMED': { v: 'error', l: 'Confirmed' },
    'VERIFIED_RESOLVED': { v: 'success', l: 'Resolved' },
    'STILL_OPEN': { v: 'warning', l: 'Open' },
    'PENDING': { v: 'warning', l: 'Pending' },
    'NEEDS_REVIEW': { v: 'error', l: 'Needs Review' },
    'RECORDED': { v: 'default', l: 'Recorded' },
  };
  
  const mapped = map[status] || { v: 'default', l: status.replace('_', ' ') };
  return <Badge variant={mapped.v}>{mapped.l}</Badge>;
}
