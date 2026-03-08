import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex-shrink-0 bg-primary-light/80 backdrop-blur-sm border-b border-secondary/45 px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
      {/* Logo */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6F61" strokeWidth="2">
            <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
          </svg>
        </div>
        <span className="font-orbitron text-sm md:text-[0.95rem] font-bold tracking-[0.12em] text-accent truncate">
          STELLARMIND
        </span>
      </div>

      {/* Center - Status */}
      <div className="hidden md:flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
        <span className="text-green-400/80 text-xs tracking-[0.08em] uppercase">
          AI Online
        </span>
      </div>

      {/* Right - User & Logout */}
      <div className="flex items-center gap-2 md:gap-3">
        {user && (
          <div className="hidden lg:flex items-center gap-2.5 max-w-[240px]">
            {user.picture && (
              <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-secondary/50 shrink-0" />
            )}
            <span className="text-neutral-dim text-xs truncate">{user.name || user.email}</span>
          </div>
        )}
        <button
          onClick={logout}
          className="ui-btn text-xs !min-h-[40px] px-4 py-2 rounded-xl border border-secondary/50 text-neutral-dim hover:text-accent hover:border-accent/40 transition-colors duration-200"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
