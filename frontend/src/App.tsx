import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';

import { AppShell } from './components/layout/AppShell';
import { RoleGuard } from './components/layout/RoleGuard';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { SignIn } from './pages/auth/SignIn';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentsPage } from './pages/admin/StudentsPage';
import { ClassesPage } from './pages/admin/ClassesPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { SettingsPage } from './pages/admin/SettingsPage';

import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TakeAttendancePage } from './pages/teacher/TakeAttendancePage';
import { SessionHistoryPage } from './pages/teacher/SessionHistoryPage';

import { StudentPortal } from './pages/student/StudentPortal';

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <BrowserRouter>
                <Routes>
                {/* Public Route */}
                <Route path="/login" element={<SignIn />} />

                {/* Role-Protected Routes within AppShell */}
                <Route element={<AppShell />}>
                  <Route path="/" element={<RootRedirect />} />

                  {/* Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <RoleGuard allowedRoles={['admin']}>
                        <AdminDashboard />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/admin/students"
                    element={
                      <RoleGuard allowedRoles={['admin']}>
                        <StudentsPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/admin/classes"
                    element={
                      <RoleGuard allowedRoles={['admin']}>
                        <ClassesPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <RoleGuard allowedRoles={['admin']}>
                        <ReportsPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/admin/audit"
                    element={
                      <RoleGuard allowedRoles={['admin']}>
                        <AuditLogPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <RoleGuard allowedRoles={['admin']}>
                        <SettingsPage />
                      </RoleGuard>
                    }
                  />

                  {/* Teacher Routes */}
                  <Route
                    path="/teacher"
                    element={
                      <RoleGuard allowedRoles={['teacher', 'admin']}>
                        <TeacherDashboard />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/teacher/take-attendance"
                    element={
                      <RoleGuard allowedRoles={['teacher', 'admin']}>
                        <TakeAttendancePage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/teacher/sessions"
                    element={
                      <RoleGuard allowedRoles={['teacher', 'admin']}>
                        <SessionHistoryPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/teacher/classes"
                    element={
                      <RoleGuard allowedRoles={['teacher', 'admin']}>
                        <ClassesPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/teacher/reports"
                    element={
                      <RoleGuard allowedRoles={['teacher', 'admin']}>
                        <ReportsPage />
                      </RoleGuard>
                    }
                  />

                  {/* Student Routes */}
                  <Route
                    path="/student"
                    element={
                      <RoleGuard allowedRoles={['student', 'admin']}>
                        <StudentPortal />
                      </RoleGuard>
                    }
                  />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
};
