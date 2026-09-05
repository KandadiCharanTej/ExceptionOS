import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ServerCrash, Database } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Investigation from './pages/Investigation';
import Analytics from './pages/Analytics';
import Datasets from './pages/Datasets';
import Copilot from './pages/Copilot';
import Performance from './pages/Performance';
import Demo from './pages/Demo';
import { healthCheck } from './services/api';
import { PrimaryButton } from './components/ui';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <ServerCrash className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">Application Error</h2>
            <p className="text-sm text-slate-500 mb-6">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <PrimaryButton onClick={() => window.location.reload()}>Reload Application</PrimaryButton>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default function App() {
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);

  useQuery({
    queryKey: ['healthCheck'],
    queryFn: healthCheck,
    enabled: false,
  });

  useEffect(() => {
    healthCheck()
      .then(() => setIsApiAvailable(true))
      .catch(() => setIsApiAvailable(false));
  }, []);

  if (isApiAvailable === null) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center">
        <Database className="h-10 w-10 text-blue-600 mb-4 animate-pulse" />
        <h2 className="text-lg font-semibold text-slate-700">Starting ExceptionOS...</h2>
      </div>
    );
  }

  if (isApiAvailable === false) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <ServerCrash className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">API Unavailable</h1>
          <p className="text-sm text-slate-500 mb-6">
            The ExceptionOS engine cannot be reached. Ensure the FastAPI backend is running on port 8000.
          </p>
          <PrimaryButton onClick={() => window.location.reload()} className="w-full">
            Retry Connection
          </PrimaryButton>
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl mt-4 text-left font-mono border border-slate-100">
            uvicorn exceptionos.api.main:app --reload
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </BrowserRouter>
  );
}

// Re-export cn for backward compat during migration
export { cn } from './lib/utils';
