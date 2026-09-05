import React from 'react';
import TopNavigation from './TopNavigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 flex flex-col">
      <TopNavigation />
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-5 sm:px-8 py-8 lg:py-10 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
