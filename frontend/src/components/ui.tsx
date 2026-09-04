import React from 'react';
import { cn } from '../App';

export function Card({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("px-6 py-5 border-b border-slate-100", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <h3 className={cn("text-lg font-semibold text-slate-900 tracking-tight", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("p-6", className)}>
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
    default: "bg-blue-100 text-blue-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    secondary: "bg-slate-100 text-slate-700",
    outline: "border border-slate-200 text-slate-700 bg-transparent"
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
