import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-marigold border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-muted">Checking credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-brick/40 p-8 rounded editorial-shadow text-center">
          <div className="w-12 h-12 bg-brick/10 border border-brick/30 rounded-full flex items-center justify-center mx-auto mb-4 text-brick">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-ink mb-2">Access Restricted</h2>
          <p className="text-muted text-sm mb-6 leading-relaxed">
            Your role (<span className="font-mono uppercase font-semibold text-ink">{user.role}</span>) does not have authorization to view this section.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-hairline hover:bg-surface-hover text-ink text-sm rounded font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <a
              href={user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student'}
              className="px-4 py-2 bg-marigold text-ink font-medium text-sm rounded hover:brightness-105 transition-all editorial-shadow"
            >
              Go to My Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
