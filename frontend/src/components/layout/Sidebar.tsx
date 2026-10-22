import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from './Logo';
import {
  LayoutDashboard, Users, BookOpen, Camera,
  History, FileSpreadsheet, ScrollText, Settings,
  GraduationCap, X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'admin';

  const adminNav = [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard },
    { label: 'Students', to: '/admin/students', icon: Users },
    { label: 'Classes', to: '/admin/classes', icon: BookOpen },
    { label: 'Reports & Export', to: '/admin/reports', icon: FileSpreadsheet },
    { label: 'Audit Log', to: '/admin/audit', icon: ScrollText },
    { label: 'System Settings', to: '/admin/settings', icon: Settings },
  ];

  const teacherNav = [
    { label: 'Overview', to: '/teacher', icon: LayoutDashboard },
    { label: 'Take Attendance', to: '/teacher/take-attendance', icon: Camera },
    { label: 'Session History', to: '/teacher/sessions', icon: History },
    { label: 'My Classes', to: '/teacher/classes', icon: BookOpen },
    { label: 'Reports', to: '/teacher/reports', icon: FileSpreadsheet },
  ];

  const studentNav = [
    { label: 'My Attendance', to: '/student', icon: GraduationCap },
  ];

  const currentNav = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-ink/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 border-r border-hairline bg-surface flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="h-16 px-5 border-b border-hairline flex items-center justify-between">
            <Logo />
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded text-muted hover:text-ink hover:bg-surface-hover"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 pt-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-muted font-bold">
              {role} portal
            </div>
            {currentNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin' || item.to === '/teacher' || item.to === '/student'}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-paper text-ink font-semibold border border-hairline editorial-shadow'
                        : 'text-muted hover:text-ink hover:bg-surface-hover'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-marigold" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-hairline bg-paper/30">
          <div className="p-2.5 rounded border border-hairline bg-surface text-xs text-muted">
            <div className="flex items-center justify-between mb-1">
              <span className="font-serif font-semibold text-ink">AWS Rekognition</span>
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            </div>
            <div className="text-[11px] font-mono leading-tight">
              Collection: <span className="text-ink">haazri-faces</span>
            </div>
            <div className="text-[10px] font-mono text-muted mt-1">
              v1.0.0 • College Edition
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
