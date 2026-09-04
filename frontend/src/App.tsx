import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Activity, Settings, Database } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Investigation from './pages/Investigation';
import Analytics from './pages/Analytics';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Datasets', path: '/datasets', icon: Database },
    { name: 'Cases', path: '/cases', icon: List },
    { name: 'Analytics', path: '/analytics', icon: Activity },
  ];

  return (
    <div className="w-64 bg-[#0A0F1C] text-slate-300 h-screen flex flex-col fixed left-0 top-0 border-r border-[#1E293B]">
      <div className="h-16 flex items-center px-6 border-b border-[#1E293B]">
        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-900/20">
          <Database className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">ExceptionOS</span>
      </div>
      
      <div className="flex-1 py-6 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
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
  );
}

function Header() {
  return (
    <div className="h-16 bg-[#0A0F1C] border-b border-[#1E293B] flex items-center px-8 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        <span className="text-sm font-medium text-slate-300">System Operational</span>
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
  return (
    <div className="flex h-screen bg-[#05080F] font-sans text-slate-200">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

import Datasets from './pages/Datasets';
import { healthCheck } from './services/api';
import { ServerCrash } from 'lucide-react';

function App() {
  const [isApiAvailable, setIsApiAvailable] = React.useState<boolean | null>(null);

  React.useEffect(() => {
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
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 flex items-center justify-center rounded-full mb-6">
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
            <div className="text-xs text-slate-500 bg-slate-950 p-3 rounded text-left border border-slate-800 font-mono">
              $ cd exceptionos<br />
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
