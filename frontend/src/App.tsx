import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Activity, Settings, Database, Menu, X, ServerCrash, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useQuery } from '@tanstack/react-query';

import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Investigation from './pages/Investigation';
import Analytics from './pages/Analytics';
import Datasets from './pages/Datasets';
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
        <div className="flex h-screen w-full items-center justify-center bg-[#05080F] p-4">
          <div className="max-w-md w-full bg-[#0A0F1C] border border-[#1E293B] rounded-lg p-6 shadow-xl text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Application Error</h2>
            <p className="text-sm text-slate-400 mb-6">{this.state.error?.message || "An unexpected error occurred."}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
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

function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Datasets', path: '/datasets', icon: Database },
    { name: 'Cases', path: '/cases', icon: List },
    { name: 'Analytics', path: '/analytics', icon: Activity },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-[#0A0F1C] text-slate-300 flex flex-col border-r border-[#1E293B] z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-[#1E293B] justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-900/20">
              <Database className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">ExceptionOS</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 py-6 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                            (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                    : "text-slate-400 hover:bg-[#1E293B]/50 hover:text-slate-200 border border-transparent"
                )}
              >
                <item.icon className={cn("h-4 w-4 mr-3", isActive ? "text-blue-500" : "text-slate-500")} />
                {item.name}
              </Link>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-[#1E293B] flex flex-col gap-2">
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="flex items-center text-sm px-3 py-2 rounded-md text-slate-400 hover:text-white hover:bg-[#1E293B]/50 transition-colors">
            <Activity className="h-4 w-4 mr-3 text-slate-500" />
            API Docs
          </a>
          <a href="https://github.com/KandadiCharanTej/ExceptionOS" target="_blank" rel="noreferrer" className="flex items-center text-sm px-3 py-2 rounded-md text-slate-400 hover:text-white hover:bg-[#1E293B]/50 transition-colors">
            <Settings className="h-4 w-4 mr-3 text-slate-500" />
            GitHub
          </a>
        </div>
      </div>
    </>
  );
}

function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  // Polling health endpoint every 15 seconds
  const { isError, isSuccess } = useQuery({
    queryKey: ['healthCheck'],
    queryFn: healthCheck,
    refetchInterval: 15000,
    retry: 1
  });

  return (
    <div className="h-16 bg-[#0A0F1C] border-b border-[#1E293B] flex items-center px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
      <button 
        className="mr-4 lg:hidden p-2 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-md transition-colors"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-3">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isError ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
          isSuccess ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
          "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"
        )}></div>
        <span className="text-sm font-medium text-slate-300">
          {isError ? "Backend Disconnected" : isSuccess ? "System Operational" : "Connecting..."}
        </span>
      </div>

      <div className="ml-auto flex items-center space-x-4">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-900/20">
          A
        </div>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#05080F] font-sans text-slate-200">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center">
          <Database className="h-12 w-12 text-blue-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-semibold tracking-tight text-slate-200">Starting ExceptionOS...</h2>
        </div>
      </div>
    );
  }

  if (isApiAvailable === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0A0F1C] border border-[#1E293B] rounded-lg shadow-2xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 flex items-center justify-center rounded-full mb-6 border border-red-500/20">
            <ServerCrash className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">API Unavailable</h1>
          <p className="text-slate-400 mb-8">
            The ExceptionOS intelligence engine cannot be reached. Please ensure the FastAPI backend is running on port 8000.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
            >
              Retry Connection
            </button>
            <div className="text-xs text-slate-500 bg-[#05080F] p-3 rounded text-left border border-[#1E293B] font-mono">
              $ cd openrecon-main<br />
              $ uvicorn src.exceptionos.api.main:app --reload
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
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:caseId" element={<Investigation />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
