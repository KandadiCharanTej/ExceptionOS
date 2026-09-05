import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Database, ServerCrash, AlertTriangle, Layers } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useQuery } from '@tanstack/react-query';

import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Investigation from './pages/Investigation';
import Copilot from './pages/Copilot';
import Performance from './pages/Performance';
import Demo from './pages/Demo';
import { healthCheck } from './services/api';
import { AppProvider, useApp } from './context/AppContext';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-sm text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Application Error</h2>
            <p className="text-sm text-muted-foreground mb-6">{this.state.error?.message || "An unexpected error occurred."}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-5 rounded-lg transition-colors"
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

function TopNavigation() {
  const { activeDatasetId, setActiveDatasetId } = useApp();

  const { isError, isSuccess } = useQuery({
    queryKey: ['healthCheck'],
    queryFn: healthCheck,
    refetchInterval: 15000,
    retry: 1
  });

  const datasetParam = activeDatasetId ? `?dataset_id=${activeDatasetId}` : '';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="h-7 w-7 bg-primary rounded flex items-center justify-center shadow-sm">
              <Database className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">ExceptionOS</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink to={`/${datasetParam}`} end className={({isActive}) => cn("text-sm font-medium transition-colors hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground")}>
              Overview
            </NavLink>
            <NavLink to={`/demo${datasetParam}`} className={({isActive}) => cn("text-sm font-medium transition-colors hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground")}>
              Reconcile
            </NavLink>
            <NavLink to={`/cases${datasetParam}`} className={({isActive}) => cn("text-sm font-medium transition-colors hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground")}>
              Investigate
            </NavLink>
            <NavLink to={`/copilot${datasetParam}`} className={({isActive}) => cn("text-sm font-medium transition-colors hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground")}>
              AI Intelligence
            </NavLink>
            <NavLink to={`/performance${datasetParam}`} className={({isActive}) => cn("text-sm font-medium transition-colors hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground")}>
              Performance
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {activeDatasetId && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
              <Layers className="w-3.5 h-3.5" />
              <span className="max-w-[120px] truncate">{activeDatasetId}</span>
              <button
                onClick={() => setActiveDatasetId(null)}
                title="Clear dataset context filter"
                className="ml-1 text-indigo-400 hover:text-indigo-900 transition-colors font-bold"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isError ? "bg-destructive" : 
              isSuccess ? "bg-emerald-500" : 
              "bg-amber-500 animate-pulse"
            )}></div>
            {isError ? "System Offline" : isSuccess ? "System Active" : "Connecting..."}
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            A
          </div>
        </div>
      </div>
    </header>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <TopNavigation />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground">
        <div className="animate-pulse flex flex-col items-center">
          <Database className="h-10 w-10 text-primary mb-4" />
          <h2 className="text-lg font-medium tracking-tight text-foreground">Starting ExceptionOS...</h2>
        </div>
      </div>
    );
  }

  if (isApiAvailable === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-sm p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 flex items-center justify-center rounded-full mb-6">
            <ServerCrash className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2 tracking-tight">API Unavailable</h1>
          <p className="text-sm text-muted-foreground mb-8">
            The ExceptionOS intelligence engine cannot be reached. Please ensure the FastAPI backend is running on port 8000.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 rounded-lg transition-colors"
            >
              Retry Connection
            </button>
            <div className="text-xs text-muted-foreground bg-secondary p-3 rounded-lg text-left border border-border font-mono">
              $ cd openrecon-main<br />
              $ uvicorn exceptionos.api.main:app --reload
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/copilot" element={<Copilot />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:caseId" element={<Investigation />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/demo" element={<Demo />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;

