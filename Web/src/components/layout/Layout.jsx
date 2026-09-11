import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar Component */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      {/* Backdrop (visible only on mobile when sidebar is open) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#0F1A3D]/40 backdrop-blur-sm z-[90] md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header for Mobile */}
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center md:hidden justify-between flex-shrink-0">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-50 border border-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-[#0F1A3D] text-sm" style={{ fontFamily: "'Sora', sans-serif" }}>Meesent Admin</span>
          <div className="w-8 h-8"></div> {/* Spacer to keep layout centered */}
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
