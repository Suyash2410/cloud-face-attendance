import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { ClassItem, Session } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { AttendanceTrendChart } from '../../charts/AttendanceTrendChart';
import { DefaulterBarList } from '../../charts/DefaulterBarList';
import {
  Camera, BookOpen, Clock, Calendar, CheckCircle2,
  AlertCircle, ArrowRight, Eye
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        let [clsList, sessList] = await Promise.all([
          api.classes.list(user?.userId),
          api.sessions.list()
        ]);
        if (!clsList || clsList.length === 0) {
          clsList = await api.classes.list();
        }
        setClasses(clsList || []);
        setRecentSessions((sessList || []).slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const pendingReviewsCount = recentSessions.filter(s => s.status === 'review').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-muted font-bold">
            Faculty Console
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink mt-0.5">
            Welcome, {user?.name}
          </h1>
          <p className="text-xs text-muted mt-1">
            Department of Computer Engineering • Term Autumn 2026
          </p>
        </div>

        <Link
          to="/teacher/take-attendance"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-marigold text-ink rounded font-serif font-bold text-sm hover:brightness-105 transition-all editorial-shadow"
        >
          <Camera className="w-4 h-4" />
          <span>Take Class Attendance</span>
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="My Classes"
          value={classes.length}
          unit="subjects"
          subtitle="Assigned faculty"
          icon={BookOpen}
          variant="indigo"
        />
        <StatCard
          label="Sessions Marked"
          value={recentSessions.length}
          unit="lectures"
          subtitle="Committed in cloud"
          icon={CheckCircle2}
          variant="teal"
        />
        <StatCard
          label="Pending Reviews"
          value={pendingReviewsCount}
          unit="sessions"
          subtitle={pendingReviewsCount > 0 ? "Requires faculty eye" : "All sessions verified"}
          icon={AlertCircle}
          variant={pendingReviewsCount > 0 ? "marigold" : "default"}
        />
        <StatCard
          label="Today's Date"
          value="21 Oct"
          subtitle="Academic Week 12"
          icon={Calendar}
          variant="default"
        />
      </div>

      {/* Hero Trend & Defaulters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <AttendanceTrendChart initialSubject={classes[0]?.subject || 'Cloud Computing'} />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <DefaulterBarList />
        </div>
      </div>

      {/* Assigned Classes & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Assigned Classes Cards */}
        <div className="p-5 rounded bg-surface border border-hairline editorial-shadow space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-hairline">
            <h3 className="font-serif font-bold text-lg text-ink">My Assigned Rosters</h3>
            <span className="text-xs font-mono text-muted">{classes.length} classes</span>
          </div>

          <div className="space-y-3">
            {classes.map((cls) => (
              <div
                key={cls.classId}
                className="p-3.5 rounded border border-hairline bg-paper/50 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-sm text-ink">{cls.subject}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-paper border border-hairline font-bold">
                      {cls.division}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-muted mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {cls.schedule}</span>
                    <span>{cls.studentIds.length} students</span>
                  </div>
                </div>

                <Link
                  to="/teacher/take-attendance"
                  className="px-3 py-1 rounded bg-marigold text-ink text-xs font-mono font-bold hover:brightness-105 transition-all"
                >
                  Mark
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Confirmed Sessions */}
        <div className="p-5 rounded bg-surface border border-hairline editorial-shadow space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-hairline">
            <h3 className="font-serif font-bold text-lg text-ink">Recent Attendance Runs</h3>
            <Link to="/teacher/sessions" className="text-xs font-mono text-muted hover:text-ink underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentSessions.slice(0, 4).map((sess) => (
              <div
                key={sess.sessionId}
                className="p-3.5 rounded border border-hairline bg-paper/50 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <div className="font-serif font-bold text-ink">{sess.subject} ({sess.division})</div>
                  <div className="text-muted text-[11px] mt-0.5">
                    {sess.date} • {sess.slot}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-teal">
                    {sess.stats.presentCount}/{sess.stats.rosterCount} Present
                  </div>
                  <span className="text-[10px] uppercase text-muted">
                    {sess.status === 'confirmed' ? '✓ Confirmed' : '⚠ Pending Review'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
