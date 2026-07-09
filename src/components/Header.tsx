import React from 'react';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  displayName: string | null;
  email: string | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ displayName, email, onLogout }) => {
  return (
    <header className="bg-brand-bg border-b border-brand-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="New Life - A sua nova internet" 
            className="h-10 sm:h-12 w-auto object-contain"
            title="Logo New Life"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
          
          {/* SVG Fallback */}
          <div className="hidden flex-col items-start leading-none">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 22H10L15 12L12 2Z" fill="white" />
                <path d="M22 22L12 2L15 12L22 22Z" fill="white" fillOpacity="0.7" />
              </svg>
              <h1 className="text-3xl font-bold italic tracking-tight text-white mt-1">new life</h1>
            </div>
            <span className="text-[0.65rem] italic text-brand-secondary mt-1 tracking-wide ml-9">
              a sua nova internet
            </span>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <h2 className="text-lg font-bold text-white leading-tight">Relatório de Retiradas</h2>
            <p className="text-xs text-brand-secondary">{displayName || email || ''}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 bg-[#ff6868]/10 text-[#ff6868] rounded-lg hover:bg-[#ff6868]/20 transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>
    </header>
  );
};
