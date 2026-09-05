import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Database, ChevronDown, PlaySquare, Menu, X, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from "../../lib/utils";
import { healthCheck } from "../../services/api";

function useOnClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

function NavDropdown({ title, items, isActive }: { title: string; items: { label: string; to: string }[]; isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setIsOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer',
          isActive ? 'text-slate-900 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-white/60',
          isOpen && 'bg-white shadow-sm text-slate-900'
        )}
      >
        {title}
        <ChevronDown className={cn('w-3.5 h-3.5 opacity-50 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-52 bg-white border border-slate-200/80 rounded-xl shadow-lg py-1.5 z-50">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive: active }) =>
                cn(
                  'block px-4 py-2.5 text-sm transition-colors',
                  active ? 'text-blue-600 bg-blue-50/50 font-medium' : 'text-slate-600 hover:bg-slate-50'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopNavigation() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isError, isSuccess } = useQuery({
    queryKey: ['healthCheck'],
    queryFn: healthCheck,
    refetchInterval: 15000,
    retry: 1,
  });

  const isOperations = ['/cases', '/datasets'].some((p) => location.pathname.startsWith(p));
  const isIntelligence = ['/copilot', '/analytics'].some((p) => location.pathname.startsWith(p));
  const isSystem = location.pathname.startsWith('/performance');
  const isOverview = location.pathname === '/';
  const isDemo = location.pathname === '/demo';

  const mobileLink = (to: string, label: string, accent?: boolean) => (
    <NavLink
      to={to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        cn(
          'block px-4 py-3 rounded-xl text-sm font-medium transition-colors',
          isActive ? (accent ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-900 text-white') : 'text-slate-700 hover:bg-slate-100'
        )
      }
    >
      {label}
    </NavLink>
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#F4F6F9]/90 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 xl:px-12 h-[4.25rem] flex items-center justify-between">
          <div className="flex items-center gap-10">
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 transition-colors">
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900">ExceptionOS</span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-0.5 p-1 bg-slate-200/40 rounded-xl">
              <NavLink
                to="/"
                className={cn(
                  'px-3.5 py-2 text-sm font-medium rounded-lg transition-all',
                  isOverview ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Overview
              </NavLink>
              <NavDropdown
                title="Operations"
                isActive={isOperations}
                items={[
                  { label: 'Investigations', to: '/cases' },
                  { label: 'Reconciliation', to: '/datasets' },
                ]}
              />
              <NavDropdown
                title="Intelligence"
                isActive={isIntelligence}
                items={[
                  { label: 'AI Intelligence', to: '/copilot' },
                  { label: 'Analytics', to: '/analytics' },
                ]}
              />
              <NavDropdown
                title="System"
                isActive={isSystem}
                items={[{ label: 'Performance Lab', to: '/performance' }]}
              />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/demo"
              className={cn(
                'hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
                isDemo
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 shadow-sm'
              )}
            >
              <PlaySquare className="w-3.5 h-3.5" />
              Live Demo
            </NavLink>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isError ? 'bg-red-500' : isSuccess ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                )}
              />
              <span className="text-[11px] font-semibold text-slate-500">
                {isError ? 'Offline' : isSuccess ? 'Healthy' : 'Connecting'}
              </span>
            </div>

            <button className="hidden sm:flex p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>

            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer hover:bg-blue-700 transition-colors">
              U
            </div>

            <button
              className="md:hidden p-2 text-slate-500 hover:bg-white rounded-lg"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[4.25rem] bg-[#F4F6F9] z-30 p-5 space-y-2 overflow-y-auto">
          {mobileLink('/', 'Overview')}
          {mobileLink('/cases', 'Investigations')}
          {mobileLink('/datasets', 'Reconciliation')}
          {mobileLink('/copilot', 'AI Intelligence')}
          {mobileLink('/analytics', 'Analytics')}
          {mobileLink('/performance', 'Performance Lab')}
          {mobileLink('/demo', 'Live Demo', true)}
        </div>
      )}
    </>
  );
}
