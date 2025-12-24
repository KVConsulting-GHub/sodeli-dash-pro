import React from 'react';
import { LayoutDashboard, Users, BarChart3, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'funnel' | 'crm';
  onTabChange: (tab: 'funnel' | 'crm') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Header */}
      <header className="h-16 bg-[#F4002B] text-white fixed top-0 w-full z-50 shadow-md flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-lg">S</div>
          <span className="font-semibold text-lg tracking-tight">Grupo Sodéli Monitoramento</span>
        </div>
        <div className="flex items-center gap-4 text-sm opacity-90">
            <span>Admin</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="h-4 w-4" />
            </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5E5E5] fixed top-16 bottom-0 left-0 overflow-y-auto z-40">
        <div className="p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-4 tracking-wider">Dashboards</p>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('funnel')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'funnel' 
                  ? "bg-red-50 text-red-600" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Funil de Marketing
            </button>
            <button
              onClick={() => onTabChange('crm')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'crm' 
                  ? "bg-red-50 text-red-600" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              CRM & Vendas
            </button>
          </nav>

          <p className="text-xs font-semibold text-gray-400 uppercase mb-4 mt-8 tracking-wider">Configurações</p>
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
              <Settings className="h-4 w-4" />
              Geral
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 mt-16 p-8 bg-[#FAFAFA] min-h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto">
           {children}
        </div>
      </main>
    </div>
  );
};