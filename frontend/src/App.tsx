import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Database, ServerCrash, Home, Bot, PlaySquare, ChevronDown, Activity, 
  Menu, X, Search, FileText, Settings, ShieldCheck, Target, LineChart, Link2, PlusCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useQuery } from '@tanstack/react-query';

import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Investigation from './pages/Investigation';
import Analytics from './pages/Analytics';
import Datasets from './pages/Datasets';
import Copilot from './pages/Copilot';
import Performance from './pages/Performance';
import Demo from './pages/Demo';
import { healthCheck } from './services/api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
            <ServerCrash className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Application Error</h2>
            <p className="text-sm text-slate-500 mb-6">{this.state.error?.message || "An unexpected error occurred."}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom Hook for clicking outside dropdowns
function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
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

function NavDropdown({ title, items, isActive }: { title: string, items: { label: string, to: string }[], isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useOnClickOutside(ref, () => setIsOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
          isActive ? "text-slate-900 bg-slate-100/50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
          isOpen && "bg-slate-100 text-slate-900"
        )}
      >
        {title}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform opacity-60", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200/80 rounded-xl shadow-lg shadow-slate-200/50 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {items.map((item, i) => (
            <NavLink
              key={i}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => cn(
                "block px-4 py-2 text-sm font-medium transition-colors",
                isActive ? "text-blue-600 bg-blue-50/50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function TopNavigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { isError, isSuccess } = useQuery({
    queryKey: ['healthCheck'],
    queryFn: healthCheck,
    refetchInterval: 15000,
    retry: 1
  });

  // Determine active groups
  const isOperationsActive = ['/cases', '/datasets'].some(p => location.pathname.startsWith(p));
  const isIntelligenceActive = ['/copilot', '/analytics'].some(p => location.pathname.startsWith(p));
  const isSystemActive = ['/performance'].some(p => location.pathname.startsWith(p));
  const isOverviewActive = location.pathname === '/';
  const isDemoActive = location.pathname === '/demo';

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm transition-all duration-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* LEFT: Branding & Main Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center shadow-md group-hover:bg-blue-600 transition-colors">
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                ExceptionOS
              </span>
            </NavLink>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              <NavLink 
                to="/" 
                className={cn(
                  "px-3 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
                  isOverviewActive ? "text-slate-900 bg-slate-100/50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                Overview
              </NavLink>

              <NavDropdown 
                title="Operations" 
                isActive={isOperationsActive}
                items={[
                  { label: "Investigations", to: "/cases" },
                  { label: "Reconciliation", to: "/datasets" }
                ]} 
              />
              
              <NavDropdown 
                title="Intelligence" 
                isActive={isIntelligenceActive}
                items={[
                  { label: "AI Intelligence", to: "/copilot" },
                  { label: "Analytics", to: "/analytics" }
                ]} 
              />

              <NavDropdown 
                title="System" 
                isActive={isSystemActive}
                items={[
                  { label: "Performance Lab", to: "/performance" }
                ]} 
              />
            </nav>
          </div>

          {/* RIGHT: Actions & Status */}
          <div className="flex items-center gap-4">
            
            <NavLink 
              to="/demo" 
              className={cn(
                "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm",
                isDemoActive 
                  ? "bg-purple-100 text-purple-700 border-purple-200" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-purple-600"
              )}
            >
              <PlaySquare className="w-3.5 h-3.5" />
              Live Demo
            </NavLink>

            {/* Health Status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isError ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                isSuccess ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"
              )}></div>
              <span className="text-xs font-semibold text-slate-600 tracking-wide">
                {isError ? "System Offline" : isSuccess ? "Engine Live" : "Connecting..."}
              </span>
            </div>

            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-md cursor-pointer hover:bg-blue-700 transition-colors">
              U
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-30 border-t border-slate-100 flex flex-col p-4 animate-in fade-in slide-in-from-top-2 overflow-y-auto pb-20">
          <div className="space-y-6">
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Product</p>
              <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className={({isActive}) => cn("block px-3 py-2.5 rounded-lg text-sm font-semibold", isActive ? "bg-blue-50 text-blue-700" : "text-slate-700")}>Overview</NavLink>
            </div>
            
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Operations</p>
              <NavLink to="/cases" onClick={() => setMobileMenuOpen(false)} className={({isActive}) => cn("block px-3 py-2.5 rounded-lg text-sm font-semibold", isActive ? "bg-blue-50 text-blue-700" : "text-slate-700")}>Investigations</NavLink>
              <NavLink to="/datasets" onClick={() => setMobileMenuOpen(false)} className={({isActive}) => cn("block px-3 py-2.5 rounded-lg text-sm font-semibold", isActive ? "bg-blue-50 text-blue-700" : "text-slate-700")}>Reconciliation</NavLink>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Intelligence</p>
              <NavLink to="/copilot" onClick={() => setMobileMenuOpen(false)} className={({isActive}) => cn("block px-3 py-2.5 rounded-lg text-sm font-semibold", isActive ? "bg-blue-50 text-blue-700" : "text-slate-700")}>AI Intelligence</NavLink>
              <NavLink to="/analytics" onClick={() => setMobileMenuOpen(false)} className={({isActive}) => cn("block px-3 py-2.5 rounded-lg text-sm font-semibold", isActive ? "bg-blue-50 text-blue-700" : "text-slate-700")}>Analytics</NavLink>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">System</p>
              <NavLink to="/performance" onClick={() => setMobileMenuOpen(false)} className={({isActive}) => cn("block px-3 py-2.5 rounded-lg text-sm font-semibold", isActive ? "bg-blue-50 text-blue-700" : "text-slate-700")}>Performance Lab</NavLink>
              <NavLink to="/demo" onClick={() => setMobileMenuOpen(false)} className={({isActive}) => cn("block px-3 py-2.5 rounded-lg text-sm font-semibold", isActive ? "bg-purple-50 text-purple-700" : "text-slate-700")}>Live Demo</NavLink>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 flex flex-col">
      <TopNavigation />
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function App() {
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const checkApi = async () => {
      try {
        await healthCheck();
        setIsApiAvailable(true);
      } catch (e) {
        setIsApiAvailable(false);
      }
    };
    checkApi();
  }, []);

  if (isApiAvailable === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900">
        <div className="animate-pulse flex flex-col items-center">
          <Database className="h-12 w-12 text-blue-600 mb-4 animate-bounce" />
          <h2 className="text-xl font-semibold tracking-tight text-slate-700">Starting ExceptionOS...</h2>
        </div>
      </div>
    );
  }

  if (isApiAvailable === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 flex items-center justify-center rounded-full mb-6 border border-red-100">
            <ServerCrash className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">API Unavailable</h1>
          <p className="text-slate-500 mb-8">
            The ExceptionOS intelligence engine cannot be reached. Please ensure the FastAPI backend is running on port 8000.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
            <div className="text-xs text-slate-500 bg-slate-100 p-3 rounded text-left border border-slate-200 font-mono">
              $ cd openrecon-main<br />
              $ uvicorn exceptionos.api.main:app --reload
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/copilot" element={<Copilot />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:caseId" element={<Investigation />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
