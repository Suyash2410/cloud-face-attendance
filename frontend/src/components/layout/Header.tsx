import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../api/client';
import { Role } from '../../types';
import {
  Sun, Moon, Bell, LogOut, CheckCheck,
  Shield, GraduationCap, School, Menu
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, runShortageJob } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-hairline bg-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded border border-hairline hover:bg-surface-hover text-muted hover:text-ink transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* College Name & Mode Badge */}
        <div className="flex items-center gap-2.5">
          <span className="font-serif font-medium text-sm sm:text-base text-ink hidden sm:inline">
            VJTI Mumbai
          </span>
          {api.isMock && (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono tracking-tight bg-marigold/15 border border-marigold/30 text-ink font-semibold">
              MOCK MODE
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Role Switcher (Mock Mode Evaluator Tool) */}
        {api.isMock && user && (
          <div className="hidden lg:flex items-center bg-paper border border-hairline rounded p-0.5 text-xs font-mono">
            <span className="px-2 text-muted text-[10px] uppercase tracking-wider font-semibold">Switch:</span>
            {(['admin', 'teacher', 'student'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-2.5 py-1 rounded capitalize transition-all ${
                  user.role === r
                    ? 'bg-surface font-semibold text-ink shadow-xs border border-hairline'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          className="p-2 rounded border border-hairline bg-surface hover:bg-surface-hover text-muted hover:text-ink transition-all editorial-shadow"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-marigold" />}
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="Notifications"
            className="relative p-2 rounded border border-hairline bg-surface hover:bg-surface-hover text-muted hover:text-ink transition-all editorial-shadow"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-brick text-paper text-[10px] font-mono font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-hairline rounded editorial-shadow-lg z-50 overflow-hidden">
              <div className="p-3 border-b border-hairline flex items-center justify-between bg-paper/50">
                <span className="font-serif font-bold text-sm text-ink">Notifications</span>
                <span className="text-[11px] font-mono text-muted">
                  {unreadCount} unread
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-hairline">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted">No notifications yet.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3 text-xs cursor-pointer transition-colors hover:bg-surface-hover ${
                        !n.read ? 'bg-marigold/5 font-medium' : 'opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-serif font-semibold ${n.type === 'shortage' ? 'text-brick' : 'text-ink'}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] font-mono text-muted">
                          {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-muted leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              {user?.role === 'admin' && (
                <div className="p-2 border-t border-hairline bg-paper/50 flex justify-between items-center text-[11px]">
                  <button
                    onClick={() => runShortageJob()}
                    className="text-teal hover:underline font-mono inline-flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Test Daily Shortage Job
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        {user && (
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1 sm:px-2.5 py-1.5 rounded border border-hairline bg-surface hover:bg-surface-hover transition-all editorial-shadow"
            >
              <div className="w-7 h-7 rounded bg-marigold/15 border border-marigold/30 flex items-center justify-center text-ink shrink-0 font-serif font-bold text-xs">
                {user.role === 'admin' ? (
                  <Shield className="w-3.5 h-3.5 text-marigold" />
                ) : user.role === 'teacher' ? (
                  <School className="w-3.5 h-3.5 text-teal" />
                ) : (
                  <GraduationCap className="w-3.5 h-3.5 text-indigo" />
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-ink truncate max-w-[120px]">{user.name}</div>
                <div className="text-[10px] font-mono text-muted uppercase">{user.role}</div>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-surface border border-hairline rounded editorial-shadow-lg z-50 py-1">
                <div className="px-3 py-2 border-b border-hairline">
                  <div className="text-xs font-bold text-ink">{user.name}</div>
                  <div className="text-[11px] font-mono text-muted truncate">{user.email}</div>
                  <div className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-paper border border-hairline text-ink">
                    Role: {user.role}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-brick hover:bg-surface-hover flex items-center gap-2 transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
